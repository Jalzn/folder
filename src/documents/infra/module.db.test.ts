import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { toIsoInstant } from '#core/domain';
import { coreModule, createUnitOfWork } from '#core/infra';
import { useTestDatabases } from '#core/testing';
import type { DocumentEvent } from '../application/contracts/events.js';
import { DocumentsModule, disposeDocuments, documentsParticipant } from './module.js';

const databases = useTestDatabases([coreModule], 'tinyfold-documents-module-');
const modules: DocumentsModule[] = [];
const instant = '2026-11-03T12:00:00.000Z';

afterEach(() => {
  for (const module of modules.splice(0)) disposeDocuments(module);
});

async function fixture() {
  const { db } = await databases.create();
  // The owner tests its table in isolation; server integration tests apply the historical full schema.
  await sql`
    create table workspace_documents (
      id text primary key, project_id text not null, folder_id text,
      title text not null, content text not null, plain_text text not null,
      search_text text not null, format_version integer not null, version integer not null,
      created_at text not null, updated_at text not null, deleted_at text, pinned_at text
    )
  `.execute(db);
  const projectId = randomUUID();
  const folderId = randomUUID();
  const documentId = randomUUID();
  const blockId = randomUUID();
  const entityIds = [blockId, documentId];
  let eventSequence = 0;
  const unit = createUnitOfWork(db, {
    clock: () => new Date(instant),
    eventClock: () => new Date(instant),
    eventId: () => `event-${++eventSequence}`,
  });
  const documents = new DocumentsModule({
    unit,
    organization: () => ({
      findProject: async (id) => (id === projectId ? { id, archivedAt: null } : undefined),
      findFolder: async (id) => (id === folderId ? { id, projectId, deletedAt: null } : undefined),
    }),
    newId: () => {
      const id = entityIds.shift();
      if (!id) throw new Error('Entity identifiers exhausted.');
      return id;
    },
  });
  modules.push(documents);
  const input = {
    requestId: randomUUID(),
    projectId,
    title: 'Contexto',
    content: [{ type: 'paragraph', content: 'Um trecho de origem.' }],
  };
  const created = await documents.commands.create(input);
  return { db, unit, documents, input, created, projectId, folderId, documentId, blockId };
}

describe('documents module', () => {
  it('returns only batched source metadata without loading or parsing document content', async () => {
    const { db, unit, documents, documentId } = await fixture();
    await sql`update workspace_documents set content = 'unreadable body' where id = ${documentId}`.execute(db);
    await unit.read(async (scope) => {
      const repository = documentsParticipant(documents, scope).repository;
      const facts = await repository.findDocumentMetadataForOrigins([documentId, documentId, randomUUID()]);
      expect([...facts.values()]).toEqual([{ id: documentId, title: 'Contexto', deletedAt: null }]);
      expect(await repository.findDocumentMetadataForOrigins([])).toEqual(new Map());
      await expect(repository.findDocumentsForOrigins([documentId])).rejects.toThrow(SyntaxError);
    });
  });

  it('keeps entity identifiers, compact replay results and save events independent', async () => {
    const { db, documents, input, created, documentId, blockId } = await fixture();
    expect(created).toEqual({ id: documentId, version: 1, updatedAt: instant });
    const document = await documents.queries.get({ id: documentId });
    expect(document.content[0]?.id).toBe(blockId);
    expect(await documents.commands.create(input)).toEqual(created);

    const seen: DocumentEvent[] = [];
    documents.events.on('document.saved', (event) => {
      seen.push(event);
    });
    const save = {
      requestId: randomUUID(),
      id: documentId,
      expectedVersion: 1,
      title: 'Salvo',
      content: document.content,
    };
    const saved = await documents.commands.save(save);
    expect(saved).toEqual({ id: documentId, version: 2, updatedAt: instant });
    expect(await documents.commands.save(save)).toEqual(saved);
    expect(seen).toEqual([
      {
        eventId: 'event-2',
        type: 'document.saved',
        occurredAt: instant,
        entityId: documentId,
        requestId: save.requestId,
        payload: { version: 2 },
      },
    ]);
    await expect(documents.commands.save({ ...save, requestId: randomUUID() })).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
    expect(seen).toHaveLength(1);
    const requests = await sql<{ response: string }>`select response from core_mutations`.execute(db);
    expect(requests.rows).toHaveLength(2);
    expect(requests.rows.every((row) => !row.response.includes('Salvo') && !row.response.includes('origem'))).toBe(
      true,
    );
  });

  it('rolls back a bound document save when the outer multi-module flow fails', async () => {
    const { unit, documents, documentId } = await fixture();
    const document = await documents.queries.get({ id: documentId });
    const seen: DocumentEvent[] = [];
    documents.events.on('document.saved', (event) => {
      seen.push(event);
    });
    let captured: ReturnType<typeof documentsParticipant> | undefined;
    await expect(
      unit.write('workspace.combined', { requestId: randomUUID() }, async (scope) => {
        captured = documentsParticipant(documents, scope);
        await captured.commands.save({
          requestId: randomUUID(),
          id: documentId,
          expectedVersion: 1,
          title: 'Não confirmado',
          content: document.content,
        });
        throw new Error('Later participant failed.');
      }),
    ).rejects.toThrow('Later participant failed.');
    expect(await documents.queries.get({ id: documentId })).toEqual(document);
    expect(seen).toEqual([]);
    expect(() => captured?.repository.findDocument(documentId)).toThrow('Transaction scope is no longer active.');
  });

  it('keeps placement separate from edits and refuses a repository write in a read scope', async () => {
    const { unit, documents, documentId, folderId } = await fixture();
    const original = await documents.queries.get({ id: documentId });
    await expect(
      unit.read(async (scope) => {
        await documentsParticipant(documents, scope).repository.deleteDocumentRow(documentId);
      }),
    ).rejects.toThrow('A read transaction cannot perform a write.');
    const seen: DocumentEvent[] = [];
    documents.events.on('document.placementChanged', (event) => {
      seen.push(event);
    });
    const place = { id: documentId, folderId, pinnedAt: toIsoInstant(new Date(instant)) };
    await unit.writeWithoutRequestRecord(async (scope) => {
      await documentsParticipant(documents, scope).repository.placeDocument(place);
    });
    await unit.writeWithoutRequestRecord(async (scope) => {
      await documentsParticipant(documents, scope).repository.placeDocument(place);
    });
    expect(await documents.queries.get({ id: documentId })).toEqual({ ...original, ...place });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ type: 'document.placementChanged', payload: { reason: 'folder' } });
  });

  it('validates origin versions and excerpts within the caller scope and keeps trashed facts readable', async () => {
    const { unit, documents, documentId, blockId, projectId } = await fixture();
    const source = { documentId, blockId, excerpt: 'trecho de origem', expectedVersion: 1 };
    await unit.read(async (scope) => {
      const participant = documentsParticipant(documents, scope);
      expect(await participant.requireSource(source)).toEqual({
        documentId,
        documentTitle: 'Contexto',
        projectId,
        blockId,
        excerpt: source.excerpt,
      });
      await expect(participant.requireSource({ ...source, expectedVersion: 2 })).rejects.toMatchObject({
        code: 'VERSION_CONFLICT',
      });
      await expect(participant.requireSource({ ...source, excerpt: 'trecho removido' })).rejects.toMatchObject({
        code: 'VERSION_CONFLICT',
      });
    });
    await documents.commands.trash({ requestId: randomUUID(), id: documentId, expectedVersion: 1 });
    expect(await documents.queries.list({ projectId })).toEqual([]);
    const facts = await documents.queries.factsForOrigins({ ids: [documentId, documentId, randomUUID()] });
    expect(facts.size).toBe(1);
    expect(facts.get(documentId)).toMatchObject({ deletedAt: instant, title: 'Contexto' });
    expect(await documents.queries.get({ id: documentId })).toMatchObject({ deletedAt: instant });
    await expect(
      unit.read((scope) => documentsParticipant(documents, scope).requireSource({ ...source, expectedVersion: 2 })),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
