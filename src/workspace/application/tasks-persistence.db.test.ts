import { randomUUID } from 'node:crypto';
import { coreModule, type Database } from '@tinyfold/core/infra';
import { useTempDatabase } from '@tinyfold/core/testing';
import { sql } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { Project } from '../domain/project-models.js';
import type { TaskAck } from '../domain/task-models.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });
describe('workspace persistence and adversarial cases', () => {
  const database = useTempDatabase([coreModule, workspaceModule]);

  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  beforeEach(async () => {
    db = database.db;
    service = createWorkspaceService(db);
    project = await testProject(service);
  });
  it('reorders tasks with board concurrency checks and preserves stable order', async () => {
    const a = await service.createTask({ ...request(), title: 'A', projectId: project.id });
    const b = await service.createTask({ ...request(), title: 'B', projectId: project.id });
    const c = await service.createTask({ ...request(), title: 'C', projectId: project.id });
    const move = {
      ...request(),
      id: c.id,
      expectedVersion: c.version,
      expectedRevision: c.revision,
      columnId: INITIAL_COLUMN_IDS.todo,
      beforeTaskId: a.id,
    };
    const moved = await service.moveTask(move);
    expect(await service.moveTask(move)).toEqual(moved);
    const current = await service.listTasks({});
    expect(current.tasks.map((task) => task.title)).toEqual(['C', 'A', 'B']);
    expect(current.revision).toBe(5);
    await expect(
      service.moveTask({
        ...request(),
        id: b.id,
        expectedVersion: b.version,
        expectedRevision: c.revision,
        columnId: INITIAL_COLUMN_IDS.doing,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect((await service.listTasks({})).revision).toBe(5);
  });
  it("renumbers only the moved task's project column, without editing the neighbours", async () => {
    const other = await testProject(service, 'Outro');
    const created: Record<string, { id: string; version: number }> = {};
    for (const [title, projectId] of [
      ['a0', project.id],
      ['b0', other.id],
      ['a1', project.id],
      ['b1', other.id],
      ['a2', project.id],
      ['b2', other.id],
    ] as const)
      created[title] = await service.createTask({ ...request(), title, projectId });
    const rows = (projectId: string) =>
      sql`select * from workspace_tasks where project_id = ${projectId} order by id`.execute(db).then((r) => r.rows);
    const otherBefore = await rows(other.id);
    const before = await service.listTasks({ projectId: project.id });
    const moved = created.a2;
    await service.moveTask({
      ...request(),
      id: moved?.id ?? '',
      expectedVersion: moved?.version ?? 0,
      expectedRevision: before.revision,
      columnId: INITIAL_COLUMN_IDS.todo,
      beforeTaskId: created.a0?.id ?? null,
    });
    expect(await rows(other.id)).toEqual(otherBefore);
    const after = await service.listTasks({ projectId: project.id });
    expect(after.tasks.map((task) => [task.title, task.position])).toEqual([
      ['a2', 0],
      ['a0', 1],
      ['a1', 2],
    ]);
    const [was, is] = [before, after].map((list) => new Map(list.tasks.map((task) => [task.title, task])));
    // The neighbours keep version and date. The moved task gets a new version; its new date may fall in
    // the millisecond it was created in, so only the version tells.
    for (const title of ['a0', 'a1'])
      expect(is?.get(title)).toMatchObject({
        version: was?.get(title)?.version,
        updatedAt: was?.get(title)?.updatedAt,
      });
    expect(is?.get('a2')?.version).toBe((was?.get('a2')?.version ?? 0) + 1);
  });
  it('puts a task that changes project at the end of the column there, without repeating a position', async () => {
    const other = await testProject(service, 'Outro');
    const tasks: Record<string, TaskAck> = {};
    for (const [title, projectId] of [
      ['a0', project.id],
      ['b0', other.id],
      ['a1', project.id],
      ['b1', other.id],
    ] as const)
      tasks[title] = await service.createTask({ ...request(), title, projectId });
    // Each project's column numbered from 0 again, as moves within one board leave it.
    for (const [moved, before] of [
      ['a1', 'a0'],
      ['b1', 'b0'],
    ] as const) {
      const { revision } = await service.listTasks({});
      await service.moveTask({
        ...request(),
        id: tasks[moved]?.id ?? '',
        expectedVersion: 1,
        expectedRevision: revision,
        columnId: INITIAL_COLUMN_IDS.todo,
        beforeTaskId: tasks[before]?.id ?? null,
      });
    }
    await service.updateTask({ ...request(), id: tasks.a0?.id ?? '', expectedVersion: 1, projectId: other.id });
    const column = (await service.listTasks({ projectId: other.id })).tasks.map((task) => [task.title, task.position]);
    expect(column.map(([title]) => title)).toEqual(['b1', 'b0', 'a0']);
    expect(new Set(column.map(([, position]) => position)).size).toBe(3);
  });
  it('filters tasks by project and persists task deletion', async () => {
    const other = await service.createProject({ ...request(), name: 'Outro' });
    const first = await service.createTask({ ...request(), title: 'Primeira', projectId: project.id });
    await service.createTask({ ...request(), title: 'Organizada', projectId: other.id });
    expect((await service.listTasks({})).tasks).toHaveLength(2);
    expect((await service.listTasks({ projectId: project.id })).tasks.map((task) => task.id)).toEqual([first.id]);
    expect((await service.listTasks({ projectId: other.id })).tasks).toHaveLength(1);
    const deletion = { ...request(), id: first.id, expectedVersion: 1 };
    expect(await service.deleteTask(deletion)).toEqual(await service.deleteTask(deletion));
    expect((await service.listTasks({})).tasks).toHaveLength(1);
  });
});
