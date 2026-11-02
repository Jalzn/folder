import { randomUUID } from 'node:crypto';
import type { Database } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { Project } from '../domain/models.js';
import { createWorkspaceService, type WorkspaceService } from '../infra/service.js';
import { request } from '../testing/builders.js';
import { useWorkspaceDb } from '../testing/database.js';
import { testProject } from '../testing/projects.js';

const { todo, doing, done } = INITIAL_COLUMN_IDS;

describe('columns', () => {
  const workspace = useWorkspaceDb({ prefix: 'tinyfold-columns-', start: '2026-11-01T12:00:00Z' });
  let db: Database;
  let service: WorkspaceService;
  let project: Project;
  beforeEach(async () => {
    ({ db, service } = workspace);
    project = await testProject(service);
  });

  /** The active columns as [name, position, isDone, version, taskCount], in board order. */
  const columns = async () =>
    (await service.listColumns({})).columns.map((column) => [
      column.name,
      column.position,
      column.isDone,
      column.version,
      column.taskCount,
    ]);
  const task = (title: string, columnId: string, projectId = project.id) =>
    service.createTask({ ...request(), projectId, title, columnId });
  const taskRow = async (id: string) =>
    (
      await sql<{
        column_id: string;
        position: number;
        version: number;
        completed_at: string | null;
        updated_at: string;
        deleted_at: string | null;
      }>`select column_id, position, version, completed_at, updated_at, deleted_at from workspace_tasks where id = ${id}`.execute(
        db,
      )
    ).rows[0];
  const create = (name: string) => service.createColumn({ ...request(), name });

  describe('createColumn, renameColumn and moveColumn', () => {
    it('puts a new column before the done column when it is the last, with a new revision', async () => {
      const before = (await service.listColumns({})).revision;
      expect(await create('  Revisão ')).toEqual({
        id: expect.any(String),
        version: 1,
        position: 2,
        revision: before + 1,
      });
      expect(await columns()).toEqual([
        ['A fazer', 0, false, 1, 0],
        ['Em andamento', 1, false, 1, 0],
        ['Revisão', 2, false, 1, 0],
        ['Concluído', 3, true, 1, 0],
      ]);
      // With an open column last, a new one goes at the end.
      const { id } = await create('Ideias');
      await service.moveColumn({ ...request(), id: done, beforeColumnId: id });
      expect((await create('Depois')).position).toBe(5);
    });

    it('refuses a repeated name in another case or accent, an empty one, and a 21st column', async () => {
      await create('Revisão');
      await expect(create('REVISAO')).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Já existe uma coluna Revisão.',
      });
      for (const name of [' ', '\u{200B}'])
        await expect(create(name)).rejects.toMatchObject({ code: 'VALIDATION', message: 'Dê um nome à coluna.' });
      await expect(create('x'.repeat(61))).rejects.toMatchObject({
        code: 'VALIDATION',
        message: 'Use até 60 caracteres no nome da coluna.',
      });
      await expect(create('\u{0000}x')).rejects.toMatchObject({ code: 'VALIDATION' });
      for (let index = 5; index <= 20; index += 1) await create(`Coluna ${index}`);
      await expect(create('Uma a mais')).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Máximo de 20 colunas.',
      });
    });

    it('renames with a new version and no new revision, and moves without a new version', async () => {
      const revision = (await service.listColumns({})).revision;
      expect(await service.renameColumn({ ...request(), id: doing, expectedVersion: 1, name: 'Fazendo' })).toEqual({
        id: doing,
        version: 2,
      });
      await expect(
        service.renameColumn({ ...request(), id: doing, expectedVersion: 1, name: 'Outra' }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
      await expect(
        service.renameColumn({ ...request(), id: todo, expectedVersion: 1, name: 'fazendo' }),
      ).rejects.toMatchObject({ code: 'DOMAIN_RULE', message: 'Já existe uma coluna Fazendo.' });
      expect((await service.listColumns({})).revision).toBe(revision);

      expect(await service.moveColumn({ ...request(), id: done, beforeColumnId: todo })).toEqual({
        revision: revision + 1,
        columns: [
          { id: done, position: 0 },
          { id: todo, position: 1 },
          { id: doing, position: 2 },
        ],
      });
      expect(await columns()).toEqual([
        ['Concluído', 0, true, 1, 0],
        ['A fazer', 1, false, 1, 0],
        ['Fazendo', 2, false, 2, 0],
      ]);
      await expect(service.moveColumn({ ...request(), id: todo, beforeColumnId: todo })).rejects.toMatchObject({
        code: 'VALIDATION',
        message: 'Escolha outra coluna como referência.',
      });
      await expect(service.moveColumn({ ...request(), id: todo, beforeColumnId: randomUUID() })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('deleteColumn and restoreColumn', () => {
    it('moves every task, live and trashed, of every project to the end of the destination, and undoes it', async () => {
      const other = await testProject(service, 'Outro');
      const review = (await create('Revisão')).id;
      await task('Já em andamento', doing);
      const [first, second] = [await task('Primeira', review), await task('Segunda', review)];
      const elsewhere = await task('Noutro projeto', review, other.id);
      const trashed = await task('Na lixeira', review);
      await service.deleteTask({ ...request(), id: trashed.id, expectedVersion: 1 });
      const before = await Promise.all([first, second, elsewhere, trashed].map((item) => taskRow(item.id)));

      const deleted = await service.deleteColumn({
        ...request(),
        id: review,
        expectedVersion: 1,
        destinationId: doing,
      });
      const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : 1);
      expect({ ...deleted, moved: [...deleted.moved].sort(byId) }).toEqual({
        id: review,
        version: 2,
        revision: expect.any(Number),
        moved: [
          { id: first.id, version: 2, position: 0, completedAt: null },
          { id: second.id, version: 2, position: 1, completedAt: null },
          { id: trashed.id, version: 3, position: 2, completedAt: null },
          { id: elsewhere.id, version: 2, position: 0, completedAt: null },
        ].sort(byId),
        complete: true,
      });
      const after = await Promise.all([first, second, elsewhere, trashed].map((item) => taskRow(item.id)));
      expect(after.map((row) => [row?.column_id, row?.position])).toEqual([
        [doing, 1],
        [doing, 2],
        [doing, 0],
        [doing, 3],
      ]);
      // Not an edit: the update dates stay.
      expect(after.map((row) => row?.updated_at)).toEqual(before.map((row) => row?.updated_at));
      expect(await columns()).toEqual([
        ['A fazer', 0, false, 1, 0],
        ['Em andamento', 1, false, 1, 4],
        ['Concluído', 2, true, 1, 0],
      ]);

      const undo = { ...request(), id: review, expectedVersion: 2, moved: deleted.moved };
      expect(await service.restoreColumn(undo)).toEqual({
        id: review,
        version: 3,
        position: 2,
        revision: expect.any(Number),
        restored: 4,
        skipped: 0,
      });
      expect(await service.restoreColumn(undo)).toMatchObject({ restored: 4 });
      const back = await Promise.all([first, second, elsewhere, trashed].map((item) => taskRow(item.id)));
      expect(back.map((row) => [row?.column_id, row?.position, row?.deleted_at !== null])).toEqual([
        [review, 0, false],
        [review, 1, false],
        [review, 0, false],
        [review, 2, true],
      ]);
      expect(await columns()).toEqual([
        ['A fazer', 0, false, 1, 0],
        ['Em andamento', 1, false, 1, 1],
        ['Revisão', 2, false, 3, 3],
        ['Concluído', 3, true, 1, 0],
      ]);
      await expect(service.restoreColumn({ ...undo, ...request(), expectedVersion: 3 })).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Esta coluna não foi excluída.',
      });
    });

    it('completes the tasks it moves to the done column, and gives the undo their open column back', async () => {
      const review = (await create('Revisão')).id;
      const moved = await task('Revisar', review);
      const deleted = await service.deleteColumn({ ...request(), id: review, expectedVersion: 1, destinationId: done });
      expect(await taskRow(moved.id)).toMatchObject({ column_id: done, completed_at: expect.any(String) });
      await service.restoreColumn({ ...request(), id: review, expectedVersion: 2, moved: deleted.moved });
      expect(await taskRow(moved.id)).toMatchObject({ column_id: review, completed_at: null, version: 3 });
    });

    it('skips what changed since, and refuses a name another column took', async () => {
      const review = (await create('Revisão')).id;
      const [stays, movedOn, trashedSince] = [
        await task('Fica', review),
        await task('Sai', review),
        await task('Vai à lixeira', review),
      ];
      const deleted = await service.deleteColumn({ ...request(), id: review, expectedVersion: 1, destinationId: todo });
      const { revision } = await service.listTasks({});
      await service.moveTask({
        ...request(),
        id: movedOn.id,
        expectedVersion: 2,
        expectedRevision: revision,
        columnId: doing,
      });
      await service.deleteTask({ ...request(), id: trashedSince.id, expectedVersion: 2 });
      const taken = await create('revisao');
      const undo = { ...request(), id: review, expectedVersion: 2, moved: deleted.moved };
      await expect(service.restoreColumn(undo)).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Já existe uma coluna revisao. Renomeie-a antes de desfazer.',
      });
      await service.renameColumn({ ...request(), id: taken.id, expectedVersion: 1, name: 'Outra' });
      expect(await service.restoreColumn({ ...undo, ...request() })).toMatchObject({ restored: 1, skipped: 2 });
      expect((await taskRow(stays.id))?.column_id).toBe(review);
      expect((await taskRow(movedOn.id))?.column_id).toBe(doing);
      expect(await taskRow(trashedSince.id)).toMatchObject({ column_id: todo, deleted_at: expect.any(String) });
    });

    it('needs no destination when empty, and refuses the done column, the last open one and a bad destination', async () => {
      const empty = (await create('Vazia')).id;
      expect(await service.deleteColumn({ ...request(), id: empty, expectedVersion: 1 })).toMatchObject({
        moved: [],
        complete: true,
      });
      await expect(service.deleteColumn({ ...request(), id: done, expectedVersion: 1 })).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Marque outra coluna como conclusão antes.',
      });
      await task('Ocupa', todo);
      for (const destinationId of [undefined, todo, empty, randomUUID()])
        await expect(
          service.deleteColumn({
            ...request(),
            id: todo,
            expectedVersion: 1,
            ...(destinationId ? { destinationId } : {}),
          }),
        ).rejects.toMatchObject({ code: 'VALIDATION' });
      await service.deleteColumn({ ...request(), id: todo, expectedVersion: 1, destinationId: doing });
      await expect(
        service.deleteColumn({ ...request(), id: doing, expectedVersion: 1, destinationId: done }),
      ).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'O quadro precisa de pelo menos uma coluna além da de conclusão.',
      });
    });

    it('lists at most 1,000 tasks, says so, and still moves them all', async () => {
      const review = (await create('Revisão')).id;
      await sql`insert into workspace_tasks (id, project_id, column_id, title, position, search_text, version, text_version, created_at, updated_at)
        select lower(hex(randomblob(16))), ${project.id}, ${review}, 'x', i, 'x', 1, 1, 'a', 'a'
        from (with recursive n(i) as (select 0 union all select i + 1 from n where i < 1000) select i from n)`.execute(
        db,
      );
      const deleted = await service.deleteColumn({ ...request(), id: review, expectedVersion: 1, destinationId: todo });
      expect([deleted.moved.length, deleted.complete]).toEqual([1_000, false]);
      expect((await service.listColumns({})).columns[0]?.taskCount).toBe(1_001);
    });
  });

  describe('setDoneColumn', () => {
    it('switches the done column, completing and reopening tasks without a new version, and undoes it', async () => {
      const review = (await create('Revisão')).id;
      const [finished, inReview] = [await task('Pronta', done), await task('Revisando', review)];
      const finishedAt = (await taskRow(finished.id))?.completed_at;
      const revision = (await service.listColumns({})).revision;

      const switched = await service.setDoneColumn({ ...request(), id: review });
      expect(switched).toEqual({
        revision: revision + 1,
        previousId: done,
        left: [{ id: finished.id, completedAt: finishedAt }],
        complete: true,
      });
      expect(await taskRow(finished.id)).toMatchObject({ completed_at: null, version: 1 });
      expect(await taskRow(inReview.id)).toMatchObject({ completed_at: expect.any(String), version: 1 });
      expect((await columns()).map(([name, , isDone]) => [name, isDone])).toEqual([
        ['A fazer', false],
        ['Em andamento', false],
        ['Revisão', true],
        ['Concluído', false],
      ]);
      await expect(service.setDoneColumn({ ...request(), id: review })).rejects.toMatchObject({
        code: 'DOMAIN_RULE',
        message: 'Esta coluna já é a de conclusão.',
      });

      await service.setDoneColumn({ ...request(), id: done, restore: switched.left });
      expect(await taskRow(finished.id)).toMatchObject({ completed_at: finishedAt, version: 1 });
      expect(await taskRow(inReview.id)).toMatchObject({ completed_at: null });
      await expect(service.setDoneColumn({ ...request(), id: randomUUID() })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it("completes the new done column's tasks at the application's time, even with a clock that stands still", async () => {
      const at = '2026-11-10T09:00:00.000Z';
      const still = createWorkspaceService(db, () => new Date(at));
      const review = await still.createColumn({ ...request(), name: 'Revisão' });
      const waiting = await still.createTask({
        ...request(),
        projectId: project.id,
        title: 'Revisando',
        columnId: review.id,
      });
      // The column's updated_at stays the same, so the trigger alone would use SQLite's clock.
      await still.setDoneColumn({ ...request(), id: review.id });
      expect(await taskRow(waiting.id)).toMatchObject({ completed_at: at });
    });

    it('stores an undo completion sent without milliseconds in the server form, which pages', async () => {
      const review = (await create('Revisão')).id;
      const [first, second] = [await task('Primeira', done), await task('Segunda', done)];
      await service.setDoneColumn({ ...request(), id: review });
      await service.setDoneColumn({
        ...request(),
        id: done,
        restore: [
          { id: first.id, completedAt: '2026-11-01T11:00:00Z' },
          { id: second.id, completedAt: '2026-11-01T10:59:59.5Z' },
        ],
      });
      expect(await taskRow(first.id)).toMatchObject({ completed_at: '2026-11-01T11:00:00.000Z' });
      expect(await taskRow(second.id)).toMatchObject({ completed_at: '2026-11-01T10:59:59.500Z' });
      const page = await service.listCompletedTasks({ projectId: project.id, limit: 1 });
      expect(page).toMatchObject({ nextCursor: `c~2026-11-01T11:00:00.000Z~${first.id}` });
      const next = await service.listCompletedTasks({ projectId: project.id, limit: 1, cursor: page.nextCursor ?? '' });
      expect(next.items.map((item) => item.id)).toEqual([second.id]);
    });

    it('refuses an undo list with a completion in the future, in setDoneColumn and restoreColumn', async () => {
      const review = (await create('Revisão')).id;
      const finished = await task('Pronta', done);
      await service.setDoneColumn({ ...request(), id: review });
      const future = { code: 'VALIDATION', message: 'A data de conclusão não pode estar no futuro.' };
      // The service's clock is a little past 2026-11-01T12:00:00Z.
      await expect(
        service.setDoneColumn({
          ...request(),
          id: done,
          restore: [{ id: finished.id, completedAt: '2999-01-01T00:00:00.000Z' }],
        }),
      ).rejects.toMatchObject(future);
      expect((await columns()).find(([name]) => name === 'Revisão')?.[2]).toBe(true);
      // A completion within a minute of the clock is no forgery.
      await service.setDoneColumn({
        ...request(),
        id: done,
        restore: [{ id: finished.id, completedAt: '2026-11-01T12:00:50.000Z' }],
      });
      expect(await taskRow(finished.id)).toMatchObject({ completed_at: '2026-11-01T12:00:50.000Z' });

      const moved = await task('Revisar', review);
      const deleted = await service.deleteColumn({ ...request(), id: review, expectedVersion: 1, destinationId: todo });
      const forged = deleted.moved.map((item) => ({ ...item, completedAt: '2026-11-01T13:00:00.000Z' }));
      await expect(
        service.restoreColumn({ ...request(), id: review, expectedVersion: deleted.version, moved: forged }),
      ).rejects.toMatchObject(future);
      expect(await taskRow(moved.id)).toMatchObject({ column_id: todo });
    });
  });

  it('answers a repeated request with what it answered first', async () => {
    const input = { ...request(), name: 'Revisão' };
    const first = await service.createColumn(input);
    expect(await service.createColumn(input)).toEqual(first);
    const move = { ...request(), id: first.id, beforeColumnId: todo };
    const moved = await service.moveColumn(move);
    expect(await service.moveColumn(move)).toEqual(moved);
    expect((await columns()).map(([name]) => name)).toEqual(['Revisão', 'A fazer', 'Em andamento', 'Concluído']);
  });
});
