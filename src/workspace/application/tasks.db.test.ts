import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { DocumentBlock, Project } from '../domain/models.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });
const { todo, doing, done } = INITIAL_COLUMN_IDS;
const paragraph = (text: string): DocumentBlock => ({
  type: 'paragraph',
  content: [{ type: 'text', text, styles: {} }],
});
const check = (text: string, checked: boolean): DocumentBlock => ({
  type: 'checkListItem',
  props: { checked },
  content: [{ type: 'text', text, styles: {} }],
});

describe('tasks', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-tasks-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    let now = new Date('2026-11-01T12:00:00Z');
    service = createWorkspaceService(db, () => {
      now = new Date(now.getTime() + 1000);
      return now;
    });
    project = await testProject(service);
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  const task = (title: string, fields: { columnId?: string; projectId?: string } = {}) =>
    service.createTask({ ...request(), projectId: project.id, title, ...fields });
  const label = async (name: string) => (await service.createLabel({ ...request(), name })).id;
  const revision = async () => (await service.listTasks({})).revision;
  const board = async (columnId: string) =>
    (await service.listTasks({ projectId: project.id })).tasks
      .filter((item) => item.columnId === columnId)
      .sort((a, b) => a.position - b.position)
      .map((item) => item.title);

  describe('fields', () => {
    it('takes a due date, labels and a column, with a new version and the revision only for the board', async () => {
      const created = await task('Planejar');
      const [mcp, backend] = [await label('mcp'), await label('backend')];
      const before = await revision();
      const dated = await service.updateTask({
        ...request(),
        id: created.id,
        expectedVersion: 1,
        dueOn: '2026-11-04',
        labelIds: [mcp, backend, mcp],
      });
      // Neither the due date nor the labels change the board's order.
      expect(dated).toMatchObject({ version: 2, revision: before });
      expect(await service.getTask({ id: created.id })).toMatchObject({
        dueOn: '2026-11-04',
        labelIds: [backend, mcp],
        version: 2,
        textVersion: 1,
      });
      const moved = await service.updateTask({ ...request(), id: created.id, expectedVersion: 2, columnId: doing });
      expect(moved).toMatchObject({ version: 3, revision: before + 1 });
      const cleared = await service.updateTask({
        ...request(),
        id: created.id,
        expectedVersion: 3,
        dueOn: null,
        labelIds: [],
      });
      expect(cleared.revision).toBe(before + 1);
      expect(await service.getTask({ id: created.id })).toMatchObject({ dueOn: null, labelIds: [], columnId: doing });
    });

    it('refuses an invalid due date, 21 labels, a deleted label and an archived project', async () => {
      const created = await task('Planejar');
      for (const dueOn of ['2026-02-30', '04/11/2026', ''])
        expect(() => service.updateTask({ ...request(), id: created.id, expectedVersion: 1, dueOn })).toThrow();
      const many = [];
      for (let index = 0; index < 21; index += 1) many.push(await label(`etiqueta ${index}`));
      await expect(
        service.updateTask({ ...request(), id: created.id, expectedVersion: 1, labelIds: many }),
      ).rejects.toMatchObject({ code: 'VALIDATION', message: 'Use até 20 etiquetas numa tarefa.' });
      const gone = many[0] ?? '';
      await service.deleteLabel({ ...request(), id: gone, expectedVersion: 1 });
      for (const labelIds of [[gone], [randomUUID()]])
        await expect(
          service.updateTask({ ...request(), id: created.id, expectedVersion: 1, labelIds }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'A etiqueta não está disponível.' });
      const archived = await testProject(service, 'Antigo');
      await service.updateProject({ ...request(), id: archived.id, expectedVersion: 1, archived: true });
      await expect(
        service.updateTask({ ...request(), id: created.id, expectedVersion: 1, projectId: archived.id }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      await expect(
        service.updateTask({ ...request(), id: created.id, expectedVersion: 1, columnId: randomUUID() }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'A coluna não está disponível.' });
    });

    it('completes a task at the top of the done column and reopens it at the end of the first open one', async () => {
      const [old, finishing] = [await task('Antiga', { columnId: done }), await task('Concluindo')];
      await task('Aberta');
      await service.updateTask({ ...request(), id: finishing.id, expectedVersion: 1, columnId: done });
      expect(await board(done)).toEqual(['Concluindo', 'Antiga']);
      const completed = await service.getTask({ id: finishing.id });
      expect(completed.completedAt).toEqual(expect.any(String));
      await service.updateTask({ ...request(), id: finishing.id, expectedVersion: 2, columnId: todo });
      expect(await board(todo)).toEqual(['Aberta', 'Concluindo']);
      expect((await service.getTask({ id: finishing.id })).completedAt).toBeNull();
      expect((await service.getTask({ id: old.id })).completedAt).toEqual(expect.any(String));
      // A task moved to another project keeps its column there, at the end, and its completion.
      const other = await testProject(service, 'Outro');
      const kept = (await service.getTask({ id: old.id })).completedAt;
      await service.updateTask({ ...request(), id: old.id, expectedVersion: 1, projectId: other.id });
      expect(await service.getTask({ id: old.id })).toMatchObject({
        projectId: other.id,
        columnId: done,
        completedAt: kept,
      });
    });

    it('creates a copy with its column, due date, labels and description', async () => {
      const mcp = await label('mcp');
      const copy = await service.createTask({
        ...request(),
        projectId: project.id,
        title: 'Cópia',
        columnId: doing,
        dueOn: '2026-11-10',
        labelIds: [mcp],
        description: [paragraph('Texto'), check('Item', true), check('Outro', false)],
      });
      expect(await service.getTask({ id: copy.id })).toMatchObject({
        title: 'Cópia',
        columnId: doing,
        dueOn: '2026-11-10',
        labelIds: [mcp],
        checklist: { done: 1, total: 2 },
        description: [
          expect.objectContaining({ id: expect.any(String), type: 'paragraph' }),
          expect.objectContaining({ type: 'checkListItem' }),
          expect.objectContaining({ type: 'checkListItem' }),
        ],
        deletedAt: null,
      });
    });
  });

  describe('text', () => {
    it('saves the title and description with their own version, never conflicting with a field change', async () => {
      const created = await task('Planejar');
      const before = await revision();
      await service.updateTask({ ...request(), id: created.id, expectedVersion: 1, dueOn: '2026-11-04' });
      // The text was read at textVersion 1, before the field change: it still saves.
      const saved = await service.saveTaskText({
        ...request(),
        id: created.id,
        expectedTextVersion: 1,
        title: 'Planejar a etapa',
        description: [
          paragraph('Revisão do plano'),
          check('Ler', true),
          check('Escrever', false),
          check('Rever', false),
        ],
      });
      expect(saved).toEqual({ id: created.id, textVersion: 2, updatedAt: expect.any(String) });
      expect(await service.getTask({ id: created.id })).toMatchObject({
        title: 'Planejar a etapa',
        version: 2,
        textVersion: 2,
        dueOn: '2026-11-04',
        checklist: { done: 1, total: 3 },
        updatedAt: saved.updatedAt,
      });
      expect(await revision()).toBe(before);
      const row = (
        await sql<{ search_text: string; description_plain_text: string }>`select search_text, description_plain_text
          from workspace_tasks where id = ${created.id}`.execute(db)
      ).rows[0];
      expect(row?.search_text).toContain('planejar a etapa\nrevisao do plano');
      await expect(
        service.saveTaskText({ ...request(), id: created.id, expectedTextVersion: 1, title: 'x', description: [] }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
      // A field change at the old version still conflicts on its own version.
      await expect(
        service.updateTask({ ...request(), id: created.id, expectedVersion: 1, dueOn: null }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    });

    it('names an empty title "Sem título", refuses an invalid or oversized description, and a trashed task', async () => {
      const created = await task('Planejar');
      await service.saveTaskText({
        ...request(),
        id: created.id,
        expectedTextVersion: 1,
        title: ' \u{200B} ',
        description: [],
      });
      expect((await service.getTask({ id: created.id })).title).toBe('Sem título');
      const save = (description: unknown) =>
        service.saveTaskText({
          ...request(),
          id: created.id,
          expectedTextVersion: 2,
          title: 'x',
          description: description as DocumentBlock[],
        });
      expect(() => save([{ type: 'unknownBlock' }])).toThrow();
      expect(() => save([paragraph('x'.repeat(1024 * 1024))])).toThrow();
      await service.deleteTask({ ...request(), id: created.id, expectedVersion: 1 });
      await expect(save([])).rejects.toMatchObject({ code: 'NOT_FOUND' });
      // The drawer still reads it from the trash, to recover a draft.
      expect(await service.getTask({ id: created.id })).toMatchObject({ deletedAt: expect.any(String) });
      await expect(service.getTask({ id: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('moves', () => {
    it('moves with the expected revision, and without it, for an undo, before a neighbour or at the end', async () => {
      const [a, b, c] = [await task('A'), await task('B'), await task('C')];
      await service.moveTask({
        ...request(),
        id: c.id,
        expectedVersion: 1,
        expectedRevision: await revision(),
        columnId: todo,
        beforeTaskId: a.id,
      });
      expect(await board(todo)).toEqual(['C', 'A', 'B']);
      await expect(
        service.moveTask({ ...request(), id: a.id, expectedVersion: 1, expectedRevision: 0, columnId: doing }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
      // The undo of a completion: back before the task that was after it.
      await service.updateTask({ ...request(), id: a.id, expectedVersion: 1, columnId: done });
      await service.moveTask({ ...request(), id: a.id, expectedVersion: 2, columnId: todo, beforeTaskId: b.id });
      expect(await board(todo)).toEqual(['C', 'A', 'B']);
      expect((await service.getTask({ id: a.id })).completedAt).toBeNull();
      // Once that neighbour left the column, to the end.
      await service.updateTask({ ...request(), id: b.id, expectedVersion: 1, columnId: doing });
      await service.updateTask({ ...request(), id: a.id, expectedVersion: 3, columnId: done });
      await service.moveTask({ ...request(), id: a.id, expectedVersion: 4, columnId: todo, beforeTaskId: b.id });
      expect(await board(todo)).toEqual(['C', 'A']);
      await expect(
        service.moveTask({
          ...request(),
          id: c.id,
          expectedVersion: 2,
          expectedRevision: await revision(),
          columnId: todo,
          beforeTaskId: b.id,
        }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    });
  });

  it('keeps labels and description in the trash, and deletes the links for good with the task', async () => {
    const mcp = await label('mcp');
    const created = await task('Planejar');
    await service.updateTask({ ...request(), id: created.id, expectedVersion: 1, labelIds: [mcp], columnId: done });
    const completedAt = (await service.getTask({ id: created.id })).completedAt;
    const trashed = await service.deleteTask({ ...request(), id: created.id, expectedVersion: 2 });
    const restored = await service.restoreTask({ ...request(), id: created.id, expectedVersion: 3 });
    expect(restored.revision).toBe(trashed.revision + 1);
    expect(await service.getTask({ id: created.id })).toMatchObject({ labelIds: [mcp], completedAt, columnId: done });
    await service.deleteTask({ ...request(), id: created.id, expectedVersion: 4 });
    await service.purgeTask({ ...request(), id: created.id, expectedVersion: 5 });
    expect((await sql`select count(*) as count from workspace_task_labels`.execute(db)).rows).toEqual([{ count: 0 }]);
    expect((await service.listLabels({})).labels).toMatchObject([{ id: mcp, taskCount: 0 }]);
  });

  it("drops the stage 09 status and updateTask's title like any key the schemas do not know", async () => {
    // A tab opened before B6 still sends them; Zod strips unknown keys, so they change nothing.
    const legacy = <T>(input: object) => input as T;
    type Create = Parameters<typeof service.createTask>[0];
    type Update = Parameters<typeof service.updateTask>[0];
    type Move = Parameters<typeof service.moveTask>[0];
    const created = await service.createTask(
      legacy<Create>({ ...request(), projectId: project.id, title: 'Antiga', status: 'done' }),
    );
    expect(await service.getTask({ id: created.id })).toMatchObject({ columnId: todo, completedAt: null });
    expect(
      await service.updateTask(
        legacy<Update>({ ...request(), id: created.id, expectedVersion: 1, status: 'done', title: 'Renomeada' }),
      ),
    ).toMatchObject({ version: 2 });
    expect(await service.getTask({ id: created.id })).toMatchObject({
      columnId: todo,
      title: 'Antiga',
      textVersion: 1,
    });
    // moveTask needs columnId: the schema refuses the move, a 400 VALIDATION over /rpc.
    expect(() =>
      service.moveTask(legacy<Move>({ ...request(), id: created.id, expectedVersion: 2, status: 'doing' })),
    ).toThrow('expected string, received undefined');
    const [listed] = (await service.listTasks({})).tasks;
    expect(listed).not.toHaveProperty('status');
  });
});
