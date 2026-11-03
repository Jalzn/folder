import { randomUUID } from 'node:crypto';
import { BoardModule } from '@tinyfold/board';
import { type BoardExternalPorts, boardParticipant } from '@tinyfold/board/composition';
import { CreateTaskInput } from '@tinyfold/board/contracts';
import { AppError, assertVersion, type TransactionScope } from '@tinyfold/core/application';
import { readCivilDate } from '@tinyfold/core/domain';
import { coreModule, createUnitOfWork } from '@tinyfold/core/infra';
import { useTestDatabases } from '@tinyfold/core/testing';
import { excerptPresent } from '@tinyfold/rich-text/domain';
import { workspaceModule } from '@tinyfold/workspace';
import { sql } from 'kysely';
import { describe, expect, it, vi } from 'vitest';

const databases = useTestDatabases([coreModule, workspaceModule], 'tinyfold-board-module-');
const instant = '2026-11-03T12:00:00.000Z';
async function fixture() {
  const { db } = await databases.create();
  const projectId = randomUUID();
  const documentId = randomUUID();
  const content = [{ id: 'source', type: 'paragraph', content: 'Trecho de origem' }];
  await sql`insert into workspace_projects (id,name,color,position,version,created_at,updated_at) values (${projectId},'Projeto','violet',0,1,${instant},${instant})`.execute(
    db,
  );
  await sql`insert into workspace_documents (id,project_id,title,content,plain_text,search_text,format_version,version,created_at,updated_at) values (${documentId},${projectId},'Origem',${JSON.stringify(content)},'Trecho de origem','trecho de origem',1,1,${instant},${instant})`.execute(
    db,
  );
  const unit = createUnitOfWork(db, { clock: () => new Date(instant) });
  const external = (scope: TransactionScope): BoardExternalPorts => ({
    async findProject(id) {
      unit.assertActive(scope);
      return id === projectId ? { id, archivedAt: null } : undefined;
    },
    async projectsByIds(ids) {
      unit.assertActive(scope);
      return ids.includes(projectId) ? [{ id: projectId, name: 'Projeto', archivedAt: null }] : [];
    },
    async documentsByIds(ids) {
      unit.assertActive(scope);
      return ids.includes(documentId)
        ? [{ id: documentId, title: 'Origem', deletedAt: null, content, plainText: 'Trecho de origem' }]
        : [];
    },
    async resolveTaskSource(source) {
      unit.assertActive(scope);
      if (source.documentId !== documentId) throw new AppError('NOT_FOUND', 'O documento não está disponível.');
      if (source.expectedVersion !== undefined) assertVersion(1, source.expectedVersion);
      if (!excerptPresent({ content, plainText: 'Trecho de origem' }, source.blockId ?? null, source.excerpt))
        throw new AppError('VERSION_CONFLICT', 'O trecho de origem mudou.');
      return {
        documentId,
        documentTitle: 'Origem',
        projectId,
        blockId: source.blockId ?? null,
        excerpt: source.excerpt,
      };
    },
  });
  const board = new BoardModule({
    unit,
    external,
    calendar: async () => ({ timeZone: 'UTC', today: readCivilDate('2026-11-03') }),
    clock: () => new Date(instant),
  });
  return { db, unit, board, projectId, documentId };
}

describe('board module integration', () => {
  it('creates an origin through a transaction-bound participant and replays its complete input once', async () => {
    const { db, unit, board, projectId, documentId } = await fixture();
    const handler = vi.fn();
    board.events.on('task.created', handler);
    const input = CreateTaskInput.parse({
      requestId: randomUUID(),
      title: 'Acompanhar',
      source: { documentId, blockId: 'source', excerpt: 'Trecho de origem', expectedVersion: 1 },
    });
    const run = () =>
      unit.write('workspace.createTask', input, (scope) =>
        boardParticipant(board, scope).operations.createTask.run(input),
      );
    const first = await run();
    expect(await run()).toEqual(first);
    const task = await board.queries.tasks.get({ id: first.id });
    expect(task).toMatchObject({
      projectId,
      source: { documentId, documentTitle: 'Origem', available: true, blockAvailable: true },
    });
    expect(handler).toHaveBeenCalledOnce();
    expect(
      (await sql<{ count: number }>`select count(*) as count from core_mutations`.execute(db)).rows[0]?.count,
    ).toBe(1);
    if (!input.source) throw new Error('Fixture source is missing.');
    const changed = { ...input, source: { ...input.source, excerpt: 'Outro' } };
    await expect(
      unit.write('workspace.createTask', changed, (scope) =>
        boardParticipant(board, scope).operations.createTask.run(changed),
      ),
    ).rejects.toMatchObject({ code: 'REQUEST_REUSED' });
  });

  it('preserves independent text/field versions, no-op updates, labels and completion', async () => {
    const { board, projectId } = await fixture();
    const created = await board.commands.tasks.create({ requestId: randomUUID(), projectId, title: 'Trabalho' });
    const changed = vi.fn();
    board.events.on('task.updated', changed);
    const noop = await board.commands.tasks.update({ requestId: randomUUID(), id: created.id, expectedVersion: 1 });
    expect(noop.version).toBe(1);
    expect(changed).not.toHaveBeenCalled();
    const text = await board.commands.tasks.saveText({
      requestId: randomUUID(),
      id: created.id,
      expectedTextVersion: 1,
      title: 'Revisado',
      description: [{ type: 'checkListItem', props: { checked: true }, content: 'Pronto' }],
    });
    expect(text.textVersion).toBe(2);
    const label = await board.commands.labels.create({ requestId: randomUUID(), name: 'Revisão' });
    const { columns } = await board.queries.columns.list({});
    const done = columns.find((column) => column.isDone);
    if (!done) throw new Error('Fixture done column is missing.');
    const fields = await board.commands.tasks.update({
      requestId: randomUUID(),
      id: created.id,
      expectedVersion: 1,
      columnId: done.id,
      dueOn: '2026-11-04',
      labelIds: [label.id],
    });
    const task = await board.queries.tasks.get({ id: created.id });
    expect(task).toMatchObject({
      title: 'Revisado',
      version: 2,
      textVersion: 2,
      columnId: done.id,
      completedAt: instant,
      labelIds: [label.id],
      checklist: { done: 1, total: 1 },
    });
    expect(fields.revision).toBeGreaterThan(created.revision);
  });

  it('rolls back participants and expires direct repository mutations, including read scopes', async () => {
    const { board, unit, projectId } = await fixture();
    const events = vi.fn();
    board.events.on('task.created', events);
    await expect(
      unit.write('workspace.combined', { requestId: randomUUID() }, async (scope) => {
        await boardParticipant(board, scope).commands.tasks.create({
          requestId: randomUUID(),
          projectId,
          title: 'Rollback',
        });
        throw new Error('Later participant failed.');
      }),
    ).rejects.toThrow('Later participant failed.');
    expect((await board.queries.tasks.list({ projectId })).tasks).toEqual([]);
    expect(events).not.toHaveBeenCalled();
    let escaped: (() => Promise<number>) | undefined;
    await unit.read(async (scope) => {
      const participant = boardParticipant(board, scope);
      escaped = participant.repository.bumpRevision;
      expect(() => participant.repository.bumpRevision()).toThrow('cannot perform a write');
    });
    expect(() => escaped?.()).toThrow('no longer active');
  });

  it('publishes one accurate update for a label-only change and no duplicate update on task creation', async () => {
    const { board, projectId } = await fixture();
    const label = await board.commands.labels.create({ requestId: randomUUID(), name: 'Revisão' });
    const updates = vi.fn();
    board.events.on('task.updated', updates);
    const task = await board.commands.tasks.create({
      requestId: randomUUID(),
      projectId,
      title: 'Etiquetas',
      labelIds: [label.id],
    });
    expect(updates).not.toHaveBeenCalled();
    await board.commands.tasks.update({ requestId: randomUUID(), id: task.id, expectedVersion: 1, labelIds: [] });
    expect(updates).toHaveBeenCalledOnce();
    expect(updates.mock.calls[0]?.[0]).toMatchObject({
      type: 'task.updated',
      payload: { version: 2, fields: ['labelIds'] },
    });
  });

  it('keeps agent listing cursors, task Markdown pages and historical document sources', async () => {
    const { board, unit, projectId, documentId } = await fixture();
    const first = await board.commands.tasks.create({
      requestId: randomUUID(),
      projectId,
      title: 'Primeira tarefa',
      description: [{ type: 'paragraph', content: 'Conteúdo '.repeat(5_000) }],
      source: { documentId, blockId: 'source', excerpt: 'Trecho de origem' },
    });
    await board.commands.tasks.create({ requestId: randomUUID(), projectId, title: 'Segunda tarefa' });
    const page = await board.queries.tasks.listForAgent({ projectId, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: first.id,
      projectName: 'Projeto',
      source: { documentId, documentTitle: 'Origem', available: true },
    });
    const cursor = page.nextCursor(1);
    if (!cursor) throw new Error('Fixture should have another task page.');
    const next = await board.queries.tasks.listForAgent({ projectId, limit: 1, cursor });
    expect(next.items[0]?.title).toBe('Segunda tarefa');
    expect(next.nextCursor(1)).toBeNull();
    const read = await board.queries.tasks.readForAgent({ id: first.id });
    expect(read.task.source).toMatchObject({ documentId, blockAvailable: true, excerpt: 'Trecho de origem' });
    if (!read.nextCursor) throw new Error('Fixture should have another Markdown page.');
    await board.commands.tasks.saveText({
      requestId: randomUUID(),
      id: first.id,
      expectedTextVersion: 1,
      title: 'Primeira tarefa',
      description: [{ type: 'paragraph', content: 'Alterado' }],
    });
    await expect(board.queries.tasks.readForAgent({ id: first.id, cursor: read.nextCursor })).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
    await board.commands.tasks.create({ requestId: randomUUID(), projectId, title: 'Nova tarefa' });
    await expect(board.queries.tasks.listForAgent({ projectId, limit: 1, cursor })).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
    await unit.write('workspace.purgeDocument', { requestId: randomUUID() }, async (scope) => {
      await boardParticipant(board, scope).repository.keepTitleInSources(documentId, 'Título preservado');
      await sql`delete from workspace_documents where id=${documentId}`.execute(unit.connection(scope));
    });
    const historical = await board.queries.tasks.readForAgent({ id: first.id });
    expect(historical.task.source).toMatchObject({
      documentId: null,
      documentTitle: 'Título preservado',
      available: false,
      blockAvailable: false,
      excerpt: 'Trecho de origem',
    });
  });
});
