import { createHash, randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { CreateTaskInput } from '#board/contracts';
import { coreModule, tables } from '#core/infra';
import { useTestDatabases } from '#core/testing';
import { workspaceModule } from '#workspace';
import type { WorkspaceEvent } from '#workspace/contracts';
import { createWorkspace } from './workspace/index.js';

const databases = useTestDatabases([coreModule, workspaceModule], 'tinyfold-workspace-module-');
const clock = () => new Date('2026-11-03T12:00:00.000Z');

interface AuditTables {
  core_mutations: { request_id: string; operation: string; fingerprint: string };
  workspace_tasks: { id: string };
  workspace_task_sources: { task_id: string; document_id: string };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

async function fixture() {
  const { db } = await databases.create();
  const runtime = createWorkspace(db, { clock });
  const project = await runtime.service.createProject({ requestId: randomUUID(), name: 'Integração' });
  const document = await runtime.service.createDocument({
    requestId: randomUUID(),
    projectId: project.id,
    title: 'Origem',
    content: [{ id: 'source', type: 'paragraph', content: 'Trecho de origem' }],
  });
  return { db, runtime, project, document };
}

function sourceInput(projectId: string, documentId: string) {
  return {
    requestId: randomUUID(),
    title: 'Tarefa com origem',
    projectId,
    dueOn: '2026-11-10',
    labelIds: [],
    description: [{ type: 'paragraph', content: 'Descrição preservada' }],
    source: { documentId, blockId: 'source', excerpt: 'Trecho de origem', expectedVersion: 1 },
  };
}

describe('workspace coordinated module', () => {
  it('emits moves only after a real placement change and keeps folder lifecycle events distinct', async () => {
    const { runtime, project, document } = await fixture();
    const folder = await runtime.service.createFolder({
      requestId: randomUUID(),
      projectId: project.id,
      name: 'Pasta',
    });
    const otherProject = await runtime.service.createProject({ requestId: randomUUID(), name: 'Destino' });
    const events: WorkspaceEvent[] = [];
    runtime.modules.workspace.events.on('workspace.changed', (event) => {
      events.push(event);
    });
    const same = {
      requestId: randomUUID(),
      type: 'document' as const,
      id: document.id,
      projectId: project.id,
      folderId: null,
    };
    const original = await runtime.service.moveItem(same);
    expect(await runtime.service.moveItem(same)).toEqual(original);
    expect(await runtime.service.moveItem({ ...same, requestId: randomUUID(), folderId: undefined })).toEqual(original);
    expect(events).toEqual([]);

    const move = { ...same, requestId: randomUUID(), folderId: folder.id };
    const moved = await runtime.service.moveItem(move);
    expect(moved).toMatchObject({ folderId: folder.id, version: document.version });
    expect(await runtime.service.moveItem(move)).toEqual(moved);
    expect(await runtime.service.moveItem({ ...move, requestId: randomUUID() })).toEqual(moved);
    expect(events.map(({ payload }) => payload.reason)).toEqual(['workspace.moveItem']);

    await runtime.service.deleteFolder({
      requestId: randomUUID(),
      id: folder.id,
      expectedVersion: 1,
      withItems: false,
    });
    expect(events.map(({ payload }) => payload.reason)).toEqual(['workspace.moveItem', 'workspace.deleteFolder']);
    const transfer = {
      ...same,
      requestId: randomUUID(),
      projectId: otherProject.id,
      expectedVersion: document.version,
    };
    const transferred = await runtime.service.moveItem(transfer);
    expect(transferred).toMatchObject({ projectId: otherProject.id, folderId: null, version: document.version + 1 });
    expect(await runtime.service.moveItem(transfer)).toEqual(transferred);
    expect(events.map(({ payload }) => payload.reason)).toEqual([
      'workspace.moveItem',
      'workspace.deleteFolder',
      'workspace.moveItem',
    ]);
    expect((await runtime.service.getDocument({ id: document.id })).updatedAt).toBe(document.updatedAt);
    runtime.dispose();
  });

  it('emits an empty-trash event only when at least one eligible item was purged', async () => {
    const { runtime, project, document } = await fixture();
    const events: WorkspaceEvent[] = [];
    runtime.modules.workspace.events.on('workspace.changed', (event) => {
      events.push(event);
    });
    const empty = { requestId: randomUUID(), projectId: project.id, items: [] };
    expect(await runtime.service.emptyTrash(empty)).toEqual({ purged: 0, skipped: 0 });
    const stale = {
      ...empty,
      requestId: randomUUID(),
      items: [{ type: 'document' as const, id: document.id, version: 1 }],
    };
    expect(await runtime.service.emptyTrash(stale)).toEqual({ purged: 0, skipped: 1 });
    const trashed = await runtime.service.deleteDocument({
      requestId: randomUUID(),
      id: document.id,
      expectedVersion: 1,
    });
    expect(await runtime.service.emptyTrash({ ...stale, requestId: randomUUID() })).toEqual({ purged: 0, skipped: 1 });
    expect(events).toEqual([]);

    const purge = {
      ...stale,
      requestId: randomUUID(),
      items: [{ type: 'document' as const, id: document.id, version: trashed.version }],
    };
    const result = await runtime.service.emptyTrash(purge);
    expect(result).toEqual({ purged: 1, skipped: 0 });
    expect(await runtime.service.emptyTrash(purge)).toEqual(result);
    expect(await runtime.service.emptyTrash({ ...purge, requestId: randomUUID() })).toEqual({ purged: 0, skipped: 1 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      requestId: purge.requestId,
      payload: { reason: 'workspace.emptyTrash', scope: { kind: 'trash', projectId: project.id } },
    });
    runtime.dispose();
  });

  it('dispatches source creation through the workspace with the complete legacy fingerprint and one event batch', async () => {
    const { db, runtime, project, document } = await fixture();
    const seen: WorkspaceEvent[] = [];
    const taskEvents: string[] = [];
    runtime.modules.workspace.events.on('workspace.changed', (event) => {
      seen.push(event);
    });
    runtime.modules.board.events.on('task.created', ({ entityId }) => {
      taskEvents.push(entityId);
    });
    const input = sourceInput(project.id, document.id);
    const created = await runtime.service.createTask(input);
    expect(await runtime.service.createTask(input)).toEqual(created);
    expect(taskEvents).toEqual([created.id]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      requestId: input.requestId,
      entityId: created.id,
      payload: {
        reason: 'workspace.createTask',
        scope: { kind: 'task', taskId: created.id, projectId: project.id, documentId: document.id },
      },
    });
    const records = await tables<AuditTables>(db)
      .selectFrom('core_mutations')
      .selectAll()
      .where('request_id', '=', input.requestId)
      .execute();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      operation: 'workspace.createTask',
      fingerprint: createHash('sha256')
        .update(canonical({ operation: 'workspace.createTask', input: CreateTaskInput.parse(input) }))
        .digest('hex'),
    });
    await expect(
      runtime.service.createTask({ ...input, source: { ...input.source, expectedVersion: 2 } }),
    ).rejects.toMatchObject({ code: 'REQUEST_REUSED' });
    const plain = await runtime.service.createTask({
      requestId: randomUUID(),
      title: 'Sem origem',
      projectId: project.id,
    });
    expect(taskEvents).toEqual([created.id, plain.id]);
    expect(seen).toHaveLength(1);
    runtime.dispose();
  });

  it('rolls back task, source, request and events when the source insert fails, then permits the same request', async () => {
    const { db, runtime, project, document } = await fixture();
    const events: string[] = [];
    runtime.modules.workspace.events.on('workspace.changed', ({ type }) => {
      events.push(type);
    });
    runtime.modules.board.events.on('task.created', ({ type }) => {
      events.push(type);
    });
    await sql`create trigger audit_source_failure before insert on workspace_task_sources
      begin select raise(abort, 'source insert failed'); end`.execute(db);
    const input = sourceInput(project.id, document.id);
    await expect(runtime.modules.workspace.commands.createTaskFromDocument(input)).rejects.toThrow(
      'source insert failed',
    );
    expect(await tables<AuditTables>(db).selectFrom('workspace_tasks').select('id').execute()).toEqual([]);
    expect(await tables<AuditTables>(db).selectFrom('workspace_task_sources').select('task_id').execute()).toEqual([]);
    expect(
      await tables<AuditTables>(db)
        .selectFrom('core_mutations')
        .select('request_id')
        .where('request_id', '=', input.requestId)
        .execute(),
    ).toEqual([]);
    expect(events).toEqual([]);
    await sql`drop trigger audit_source_failure`.execute(db);
    const created = await runtime.modules.workspace.commands.createTaskFromDocument(input);
    expect(await runtime.modules.workspace.commands.createTaskFromDocument(input)).toEqual(created);
    expect(events).toEqual(['task.created', 'workspace.changed']);
    expect((await runtime.service.getTask({ id: created.id })).source?.documentId).toBe(document.id);
    runtime.dispose();
  });

  it('publishes pin and unpin flows only on real changes without consuming a request record', async () => {
    const { db, runtime, document } = await fixture();
    const events: WorkspaceEvent[] = [];
    const placements: string[] = [];
    runtime.modules.workspace.events.on('workspace.changed', (event) => {
      events.push(event);
    });
    runtime.modules.documents.events.on('document.placementChanged', ({ payload }) => {
      placements.push(payload.reason);
    });
    const before = await tables<AuditTables>(db).selectFrom('core_mutations').select('request_id').execute();
    const input = { type: 'document' as const, id: document.id };
    const pinned = await runtime.modules.workspace.commands.pinItem(input);
    expect(await runtime.modules.workspace.commands.pinItem(input)).toEqual(pinned);
    await runtime.modules.workspace.commands.unpinItem(input);
    await runtime.modules.workspace.commands.unpinItem(input);
    expect(placements).toEqual(['pin', 'pin']);
    expect(events.map(({ requestId, payload }) => ({ requestId, ...payload }))).toEqual([
      {
        requestId: undefined,
        reason: 'workspace.pinItem',
        scope: { kind: 'item', itemType: 'document', itemId: document.id },
      },
      {
        requestId: undefined,
        reason: 'workspace.unpinItem',
        scope: { kind: 'item', itemType: 'document', itemId: document.id },
      },
    ]);
    expect(await tables<AuditTables>(db).selectFrom('core_mutations').select('request_id').execute()).toEqual(before);
    runtime.dispose();
  });
});
