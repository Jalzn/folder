import { sql } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '#core/infra';
import type { Project } from '#projects/domain';
import { request } from '../../testing/workspace/builders.js';
import { useWorkspaceDb } from '../../testing/workspace/database.js';
import { testProject } from '../../testing/workspace/projects.js';
import type { WorkspaceService } from '../../workspace/service.js';

describe('labels', () => {
  const workspace = useWorkspaceDb({ prefix: 'tinyfold-labels-' });
  let db: Database;
  let service: WorkspaceService;
  let project: Project;
  beforeEach(async () => {
    ({ db, service } = workspace);
    project = await testProject(service);
  });

  const create = (name: string, color?: 'blue' | 'lime') =>
    service.createLabel({ ...request(), name, ...(color ? { color } : {}) });
  const labels = async () =>
    (await service.listLabels({})).labels.map((label) => [label.name, label.color, label.version, label.taskCount]);
  /** Links a task to labels by SQL, until updateTask takes them. */
  const link = (taskId: string, labelId: string) =>
    sql`insert into workspace_task_labels (task_id, label_id) values (${taskId}, ${labelId})`.execute(db);

  it('creates labels in alphabetical order, each with the next free color unless one is asked for', async () => {
    expect(await create('mcp')).toEqual({ id: expect.any(String), version: 1, color: 'blue' });
    expect((await create('backend')).color).toBe('slate');
    expect((await create('Ética', 'lime')).color).toBe('lime');
    expect((await create('editor')).color).toBe('purple');
    expect(await labels()).toEqual([
      ['backend', 'slate', 1, 0],
      ['editor', 'purple', 1, 0],
      ['Ética', 'lime', 1, 0],
      ['mcp', 'blue', 1, 0],
    ]);
  });

  it('refuses a repeated name in another case, an empty or long one, and a 101st label', async () => {
    await create('mcp');
    await expect(create('MCP')).rejects.toMatchObject({ code: 'DOMAIN_RULE', message: 'Já existe uma etiqueta mcp.' });
    await expect(create('\u{200B}')).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Dê um nome à etiqueta.',
    });
    await expect(create('x'.repeat(31))).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Use até 30 caracteres no nome da etiqueta.',
    });
    for (let index = 2; index <= 100; index += 1) await create(`etiqueta ${index}`);
    await expect(create('uma a mais')).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
      message: 'Máximo de 100 etiquetas.',
    });
  });

  it('renames and recolors with a new version', async () => {
    const mcp = await create('mcp');
    await create('kanban');
    expect(await service.updateLabel({ ...request(), id: mcp.id, expectedVersion: 1, name: 'MCP' })).toEqual({
      id: mcp.id,
      version: 2,
    });
    expect(await service.updateLabel({ ...request(), id: mcp.id, expectedVersion: 2, color: 'coral' })).toEqual({
      id: mcp.id,
      version: 3,
    });
    await expect(
      service.updateLabel({ ...request(), id: mcp.id, expectedVersion: 3, name: 'Kanban' }),
    ).rejects.toMatchObject({ code: 'DOMAIN_RULE', message: 'Já existe uma etiqueta kanban.' });
    await expect(
      service.updateLabel({ ...request(), id: mcp.id, expectedVersion: 1, color: 'teal' }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(await labels()).toEqual([
      ['kanban', 'slate', 1, 0],
      ['MCP', 'coral', 3, 0],
    ]);
  });

  it('deletes a label in use, counting the live tasks, keeps its links, and gives it back to them', async () => {
    const mcp = await create('mcp');
    const [one, two, trashed] = await Promise.all(
      ['Uma', 'Outra', 'Na lixeira'].map((title) => service.createTask({ ...request(), projectId: project.id, title })),
    );
    for (const task of [one, two, trashed]) if (task) await link(task.id, mcp.id);
    if (trashed) await service.deleteTask({ ...request(), id: trashed.id, expectedVersion: 1 });
    expect(await labels()).toEqual([['mcp', 'blue', 1, 2]]);

    expect(await service.deleteLabel({ ...request(), id: mcp.id, expectedVersion: 1 })).toEqual({
      id: mcp.id,
      version: 2,
      tasks: 2,
    });
    expect(await labels()).toEqual([]);
    const labelIds = async () =>
      (await service.listTasks({ projectId: project.id })).tasks.map((task) => task.labelIds);
    expect(await labelIds()).toEqual([[], []]);
    expect((await sql`select count(*) as count from workspace_task_labels`.execute(db)).rows).toEqual([{ count: 3 }]);
    await expect(
      service.updateLabel({ ...request(), id: mcp.id, expectedVersion: 2, name: 'x' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'A etiqueta não está disponível.' });

    expect(await service.restoreLabel({ ...request(), id: mcp.id, expectedVersion: 2 })).toEqual({
      id: mcp.id,
      version: 3,
      skipped: 0,
    });
    expect(await labelIds()).toEqual([[mcp.id], [mcp.id]]);
    await expect(service.restoreLabel({ ...request(), id: mcp.id, expectedVersion: 3 })).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
      message: 'Esta etiqueta não foi excluída.',
    });
  });

  it('leaves out of the restore the tasks that reached 20 labels meanwhile', async () => {
    // The reviewer's sequence: a task with 20 labels loses one by its deletion, gets another, and
    // the undo of the deletion would give it 21.
    const ids = [];
    for (let index = 0; index < 21; index += 1) ids.push((await create(`etiqueta ${index}`)).id);
    const [first, ...others] = ids;
    const fields = (labelIds: string[]) => ({ ...request(), projectId: project.id, labelIds });
    const full = await service.createTask({ ...fields(ids.slice(0, 20)), title: 'Cheia' });
    const roomy = await service.createTask({ ...fields([first ?? '']), title: 'Com espaço' });
    const trashed = await service.createTask({ ...fields(ids.slice(0, 20)), title: 'Cheia na lixeira' });
    await service.deleteLabel({ ...request(), id: first ?? '', expectedVersion: 1 });
    await service.updateTask({ ...request(), id: full.id, expectedVersion: full.version, labelIds: others });
    await service.updateTask({ ...request(), id: trashed.id, expectedVersion: trashed.version, labelIds: others });
    await service.deleteTask({ ...request(), id: trashed.id, expectedVersion: trashed.version + 1 });

    expect(await service.restoreLabel({ ...request(), id: first ?? '', expectedVersion: 2 })).toEqual({
      id: first,
      version: 3,
      skipped: 2,
    });
    const labelsOf = async (id: string) => (await service.getTask({ id })).labelIds;
    expect(await labelsOf(full.id)).toHaveLength(20);
    expect(await labelsOf(full.id)).not.toContain(first);
    expect(await labelsOf(trashed.id)).toHaveLength(20);
    expect(await labelsOf(roomy.id)).toEqual([first]);
    // Their links went, so deleting and restoring again cannot bring the label back to them.
    expect(
      (await sql`select count(*) as count from workspace_task_labels where label_id = ${first}`.execute(db)).rows,
    ).toEqual([{ count: 1 }]);
    await service.updateTask({ ...request(), id: full.id, expectedVersion: full.version + 1, dueOn: '2026-11-20' });
  });

  it('refuses to restore a label whose name another took', async () => {
    const mcp = await create('mcp');
    await service.deleteLabel({ ...request(), id: mcp.id, expectedVersion: 1 });
    const taken = await create('MCP');
    await expect(service.restoreLabel({ ...request(), id: mcp.id, expectedVersion: 2 })).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
      message: 'Já existe uma etiqueta MCP. Renomeie-a antes de desfazer.',
    });
    await service.deleteLabel({ ...request(), id: taken.id, expectedVersion: 1 });
    expect(await service.restoreLabel({ ...request(), id: mcp.id, expectedVersion: 2 })).toMatchObject({ version: 3 });
  });

  it('answers a repeated request with what it answered first', async () => {
    const input = { ...request(), name: 'mcp' };
    const first = await service.createLabel(input);
    expect(await service.createLabel(input)).toEqual(first);
    expect(await labels()).toEqual([['mcp', 'blue', 1, 0]]);
  });
});
