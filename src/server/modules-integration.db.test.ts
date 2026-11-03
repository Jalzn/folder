import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { coreModule, type Database, idempotentWrite } from '#core/infra';
import { useTestDatabases } from '#core/testing';
import { CreateDocumentInput } from '#documents/contracts';
import { workspaceModule } from '#workspace';
import { createWorkspace } from './workspace/index.js';

const databases = useTestDatabases([coreModule, workspaceModule], 'tinyfold-module-integration-');
const instant = '2026-11-03T12:00:00.000Z';
const content = [{ id: 'origin', type: 'paragraph', content: 'Trecho preservado' }];
const runtimes: ReturnType<typeof createWorkspace>[] = [];
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
});

async function fixture() {
  const { db } = await databases.create();
  const runtime = createWorkspace(db, { clock: () => new Date(instant) });
  runtimes.push(runtime);
  const { service } = runtime;
  const project = await service.createProject({ requestId: randomUUID(), name: 'Integração' });
  return { db, ...runtime, projectId: project.id };
}

async function mutation(db: Database, requestId: string) {
  return (
    await sql<{ operation: string; response: string }>`select operation, response from core_mutations
      where request_id = ${requestId}`.execute(db)
  ).rows[0];
}

async function itemRow(db: Database, id: string) {
  return (
    await sql<{
      folder_id: string | null;
      pinned_at: string | null;
      version: number;
      updated_at: string;
      deleted_at: string | null;
    }>`select folder_id, pinned_at, version, updated_at, deleted_at from workspace_documents where id = ${id}
      union all select folder_id, pinned_at, version, updated_at, deleted_at from workspace_canvases
      where id = ${id}`.execute(db)
  ).rows[0];
}

describe('composed module transactions with historical migrations', () => {
  it('rolls back a task and its events when saving its document source fails, then retries once', async () => {
    const { db, service, modules, projectId } = await fixture();
    const document = await service.createDocument({
      requestId: randomUUID(),
      projectId,
      title: 'Origem',
      content,
    });
    const created = vi.fn();
    const changed = vi.fn();
    modules.board.events.on('task.created', created);
    modules.board.events.on('board.changed', changed);
    const input = {
      requestId: randomUUID(),
      title: 'Acompanhar',
      source: { documentId: document.id, blockId: 'origin', excerpt: 'Trecho preservado', expectedVersion: 1 },
    };
    await sql`create temp trigger fail_source before insert on workspace_task_sources
      begin select raise(abort, 'Source write failed'); end`.execute(db);
    await expect(service.createTask(input)).rejects.toThrow('Source write failed');
    expect((await service.listTasks({ projectId })).tasks).toEqual([]);
    expect(await mutation(db, input.requestId)).toBeUndefined();
    expect(created).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();

    await sql`drop trigger fail_source`.execute(db);
    const task = await service.createTask(input);
    expect(await service.createTask(input)).toEqual(task);
    expect(await service.getTask({ id: task.id })).toMatchObject({
      projectId,
      source: { documentId: document.id, available: true, excerpt: 'Trecho preservado' },
    });
    expect(created).toHaveBeenCalledOnce();
    expect(await mutation(db, input.requestId)).toMatchObject({ operation: 'workspace.createTask' });
    await expect(service.createTask({ ...input, source: { ...input.source, excerpt: 'Outro' } })).rejects.toMatchObject(
      { code: 'REQUEST_REUSED' },
    );
  });

  it.each([false, true])(
    'deletes and restores a folder with documents, drawings and shared pins (withItems=%s)',
    async (withItems) => {
      const { db, service, modules, projectId } = await fixture();
      // Root capacity is shared by both owners, including drawings already outside the folder.
      for (let index = 0; index < 7; index += 1) {
        const type = index % 2 === 0 ? 'document' : 'drawing';
        const item =
          type === 'document'
            ? await service.createDocument({ requestId: randomUUID(), projectId })
            : await service.createCanvas({ requestId: randomUUID(), projectId });
        await service.pinItem({ type, id: item.id });
      }
      const folder = await service.createFolder({ requestId: randomUUID(), projectId, name: 'Pasta' });
      const document = await service.createDocument({ requestId: randomUUID(), projectId, folderId: folder.id });
      const drawing = await service.createCanvas({ requestId: randomUUID(), projectId, folderId: folder.id });
      await service.pinItem({ type: 'document', id: document.id });
      await service.pinItem({ type: 'drawing', id: drawing.id });
      const documentBefore = await itemRow(db, document.id);
      const drawingBefore = await itemRow(db, drawing.id);
      const documentEvents = vi.fn();
      const drawingEvents = vi.fn();
      modules.documents.events.on(withItems ? 'document.trashed' : 'document.placementChanged', documentEvents);
      modules.drawings.events.on(withItems ? 'drawing.trashed' : 'drawing.placementChanged', drawingEvents);
      const input = { requestId: randomUUID(), id: folder.id, expectedVersion: 1, withItems };

      // The folder write is after the document and drawing participants, so its failure must undo both.
      await sql`create temp trigger fail_folder before update of deleted_at on workspace_folders
      when new.deleted_at is not null begin select raise(abort, 'Folder write failed'); end`.execute(db);
      await expect(service.deleteFolder(input)).rejects.toThrow('Folder write failed');
      expect(await itemRow(db, document.id)).toEqual(documentBefore);
      expect(await itemRow(db, drawing.id)).toEqual(drawingBefore);
      expect(await mutation(db, input.requestId)).toBeUndefined();
      expect(documentEvents).not.toHaveBeenCalled();
      expect(drawingEvents).not.toHaveBeenCalled();
      await sql`drop trigger fail_folder`.execute(db);

      const deleted = await service.deleteFolder(input);
      expect(await service.deleteFolder(input)).toEqual(deleted);
      expect(deleted).toMatchObject({ complete: true, unpinned: withItems ? 0 : 1 });
      expect(documentEvents).toHaveBeenCalledOnce();
      expect(drawingEvents).toHaveBeenCalledOnce();
      const deletedRows = [await itemRow(db, document.id), await itemRow(db, drawing.id)];
      if (withItems) {
        expect(deleted.trashed).toHaveLength(2);
        for (const row of deletedRows)
          expect(row).toMatchObject({ folder_id: folder.id, version: 2, pinned_at: null, deleted_at: instant });
      } else {
        expect(deleted.moved).toHaveLength(2);
        expect(deletedRows.filter((row) => row?.pinned_at !== null)).toHaveLength(1);
        for (const row of deletedRows)
          expect(row).toMatchObject({ folder_id: null, version: 1, updated_at: instant, deleted_at: null });
      }
      expect(
        await service.restoreFolder({
          requestId: randomUUID(),
          id: folder.id,
          expectedVersion: deleted.version,
          moved: deleted.moved,
          trashed: deleted.trashed,
        }),
      ).toMatchObject({ restored: 2, skipped: 0 });
      for (const id of [document.id, drawing.id])
        expect(await itemRow(db, id)).toMatchObject({
          folder_id: folder.id,
          pinned_at: instant,
          deleted_at: null,
          version: withItems ? 3 : 1,
        });
    },
  );

  it('retains the current document title and excerpt on purge and rolls back earlier source updates on failure', async () => {
    const { db, service, modules, projectId } = await fixture();
    const document = await service.createDocument({ requestId: randomUUID(), projectId, title: 'Antes', content });
    const task = await service.createTask({
      requestId: randomUUID(),
      title: 'Origem',
      source: {
        documentId: document.id,
        blockId: 'origin',
        excerpt: 'Trecho preservado',
        expectedVersion: 1,
      },
    });
    await service.saveDocument({
      requestId: randomUUID(),
      id: document.id,
      expectedVersion: 1,
      title: 'Depois',
      content,
    });
    await service.deleteDocument({ requestId: randomUUID(), id: document.id, expectedVersion: 2 });
    const purged = vi.fn();
    const boardChanged = vi.fn();
    modules.documents.events.on('document.purged', purged);
    modules.board.events.on('board.changed', boardChanged);
    const source = async () =>
      (
        await sql<{
          document_id: string | null;
          document_title: string;
          excerpt: string;
        }>`select document_id, document_title, excerpt from workspace_task_sources where task_id = ${task.id}`.execute(
          db,
        )
      ).rows[0];
    expect(await source()).toMatchObject({ document_title: 'Antes' });
    const input = { requestId: randomUUID(), id: document.id, expectedVersion: 3 };
    await sql`create temp trigger fail_document_purge before delete on workspace_documents
      begin select raise(abort, 'Document purge failed'); end`.execute(db);
    await expect(service.purgeDocument(input)).rejects.toThrow('Document purge failed');
    expect(await source()).toEqual({ document_id: document.id, document_title: 'Antes', excerpt: 'Trecho preservado' });
    expect(await itemRow(db, document.id)).toMatchObject({ version: 3, deleted_at: instant });
    expect(await mutation(db, input.requestId)).toBeUndefined();
    expect(purged).not.toHaveBeenCalled();
    expect(boardChanged).not.toHaveBeenCalled();

    await sql`drop trigger fail_document_purge`.execute(db);
    expect(await service.purgeDocument(input)).toEqual({ id: document.id });
    expect(await service.purgeDocument(input)).toEqual({ id: document.id });
    expect(await source()).toEqual({ document_id: null, document_title: 'Depois', excerpt: 'Trecho preservado' });
    expect(await service.getTask({ id: task.id })).toMatchObject({
      source: { documentId: null, documentTitle: 'Depois', available: false },
    });
    expect(await itemRow(db, document.id)).toBeUndefined();
    expect(purged).toHaveBeenCalledOnce();
    expect(boardChanged).toHaveBeenCalledOnce();
  });

  it('empties a mixed-owner trash atomically and skips restored, stale and foreign items', async () => {
    const { db, service, modules, projectId } = await fixture();
    const document = await service.createDocument({ requestId: randomUUID(), projectId });
    const drawing = await service.createCanvas({ requestId: randomUUID(), projectId });
    const task = await service.createTask({ requestId: randomUUID(), projectId, title: 'Excluir' });
    const restored = await service.createDocument({ requestId: randomUUID(), projectId });
    const stale = await service.createCanvas({ requestId: randomUUID(), projectId });
    const foreignProject = await service.createProject({ requestId: randomUUID(), name: 'Outro' });
    const foreign = await service.createDocument({ requestId: randomUUID(), projectId: foreignProject.id });
    for (const id of [document.id, restored.id, foreign.id])
      await service.deleteDocument({ requestId: randomUUID(), id, expectedVersion: 1 });
    for (const id of [drawing.id, stale.id])
      await service.deleteCanvas({ requestId: randomUUID(), id, expectedVersion: 1 });
    await service.deleteTask({ requestId: randomUUID(), id: task.id, expectedVersion: 1 });
    await service.restoreDocument({ requestId: randomUUID(), id: restored.id, expectedVersion: 2 });
    const events = vi.fn();
    modules.documents.events.on('document.purged', events);
    modules.drawings.events.on('drawing.purged', events);
    modules.board.events.on('task.purged', events);
    const input = {
      requestId: randomUUID(),
      projectId,
      items: [
        { type: 'document' as const, id: document.id, version: 2 },
        { type: 'drawing' as const, id: drawing.id, version: 2 },
        { type: 'task' as const, id: task.id, version: 2 },
        { type: 'document' as const, id: restored.id, version: 2 },
        { type: 'drawing' as const, id: stale.id, version: 1 },
        { type: 'document' as const, id: foreign.id, version: 2 },
      ],
    };
    await sql`create temp trigger fail_task_purge before delete on workspace_tasks
      begin select raise(abort, 'Task purge failed'); end`.execute(db);
    await expect(service.emptyTrash(input)).rejects.toThrow('Task purge failed');
    expect(await itemRow(db, document.id)).toMatchObject({ version: 2 });
    expect(await itemRow(db, drawing.id)).toMatchObject({ version: 2 });
    expect(await service.getTask({ id: task.id })).toMatchObject({ version: 2, deletedAt: instant });
    expect(events).not.toHaveBeenCalled();
    expect(await mutation(db, input.requestId)).toBeUndefined();
    await sql`drop trigger fail_task_purge`.execute(db);

    expect(await service.emptyTrash(input)).toEqual({ purged: 3, skipped: 3 });
    expect(await service.emptyTrash(input)).toEqual({ purged: 3, skipped: 3 });
    expect(events).toHaveBeenCalledTimes(3);
    expect(await itemRow(db, document.id)).toBeUndefined();
    expect(await itemRow(db, drawing.id)).toBeUndefined();
    await expect(service.getTask({ id: task.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await itemRow(db, restored.id)).toMatchObject({ deleted_at: null, version: 3 });
    expect(await itemRow(db, stale.id)).toMatchObject({ deleted_at: instant, version: 2 });
    expect(await itemRow(db, foreign.id)).toMatchObject({ deleted_at: instant, version: 2 });
  });

  it('replays historical mutation records without participants and keeps new records readable by the old writer', async () => {
    const { db, service, modules, projectId } = await fixture();
    const created = vi.fn();
    modules.documents.events.on('document.created', created);
    const historical = CreateDocumentInput.parse({ requestId: randomUUID(), projectId, title: 'Histórico' });
    const previous = { id: randomUUID(), version: 1, updatedAt: instant };
    // This is the pre-module persistence entry point, with its original operation and parsed fingerprint.
    await idempotentWrite(db, 'workspace.createDocument', historical, async () => previous);
    expect(await service.createDocument(historical)).toEqual(previous);
    expect(await itemRow(db, previous.id)).toBeUndefined();
    expect(created).not.toHaveBeenCalled();

    const fresh = CreateDocumentInput.parse({ requestId: randomUUID(), projectId, title: 'Atual' });
    const first = await service.createDocument(fresh);
    expect(await service.createDocument(fresh)).toEqual(first);
    const oldWork = vi.fn(async () => ({ id: 'must-not-run' }));
    expect(await idempotentWrite(db, 'workspace.createDocument', fresh, oldWork)).toEqual(first);
    expect(oldWork).not.toHaveBeenCalled();
    expect(created).toHaveBeenCalledOnce();
    expect(await mutation(db, fresh.requestId)).toMatchObject({
      operation: 'workspace.createDocument',
      response: JSON.stringify(first),
    });
  });
});
