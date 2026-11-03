import { randomUUID } from 'node:crypto';
import { coreModule, type Database } from '@tinyfold/core/infra';
import { useTempDatabase } from '@tinyfold/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { DocumentBlock } from '../domain/document-models.js';
import type { Project } from '../domain/project-models.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });
const content = (text: string, blockId = 'block-one'): DocumentBlock[] => [
  { id: blockId, type: 'paragraph', content: [{ type: 'text', text, styles: {} }], children: [] },
];
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
  it('creates a source-linked task exactly once and keeps it when text and document are removed', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Meu plano',
      content: content('Publicar meu portfólio'),
    });
    const input = {
      ...request(),
      title: 'Publicar meu portfólio',
      source: { documentId: document.id, blockId: 'block-one', excerpt: 'meu portfólio', expectedVersion: 1 },
    };
    const first = await service.createTask(input);
    expect(await service.createTask(input)).toEqual(first);
    expect((await service.listTasks({})).tasks).toHaveLength(1);
    await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Meu plano',
      content: content('Outra ideia', 'block-two'),
    });
    const changed = (await service.listTasks({ documentId: document.id })).tasks[0];
    expect(changed?.source).toMatchObject({ available: true, blockAvailable: false, excerpt: 'meu portfólio' });
    const removed = await service.deleteDocument({ ...request(), id: document.id, expectedVersion: 2 });
    expect((await service.listTasks({})).tasks[0]?.source).toMatchObject({
      available: false,
      excerpt: 'meu portfólio',
    });
    expect((await service.getDocument({ id: document.id })).deletedAt).toBe(removed.updatedAt);
    expect((await service.listDocuments({})).map((item) => item.id)).not.toContain(document.id);
    await service.restoreDocument({ ...request(), id: document.id, expectedVersion: removed.version });
    expect((await service.listTasks({})).tasks[0]?.source?.available).toBe(true);
  });
  it('rejects stale or fabricated source references atomically', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: content('Criar uma página'),
    });
    const task = {
      title: 'Publicar',
      source: { documentId: document.id, blockId: 'block-one', excerpt: 'uma página', expectedVersion: 1 },
    };
    await expect(
      service.createTask({ ...request(), ...task, source: { ...task.source, blockId: 'missing' } }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      service.createTask({ ...request(), ...task, source: { ...task.source, excerpt: 'Texto que não existe' } }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      service.createTask({ ...request(), ...task, source: { ...task.source, expectedVersion: 10 } }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    // Migration 007 raised the revision once, also on a new installation.
    expect(await service.listTasks({})).toEqual({ tasks: [], revision: 1 });
  });
  it('stores an id for every block, so a selection in content from elsewhere can become a task', async () => {
    const paragraph = (text: string): DocumentBlock => ({
      type: 'paragraph',
      content: [{ type: 'text', text, styles: {} }],
    });
    // The web's Markdown import splits a quote around a display formula into children without ids.
    const quote: DocumentBlock = {
      id: 'quote',
      type: 'quote',
      content: [{ type: 'text', text: 'Antes', styles: {} }],
      children: [{ type: 'mathBlock', props: {}, content: 'y' }, paragraph('Depois da fórmula')],
    };
    const document = await service.createDocument({ ...request(), projectId: project.id, content: [quote] });
    const stored = await service.getDocument({ id: document.id });
    expect(stored.content[0]?.id).toBe('quote');
    const after = stored.content[0]?.children?.[1];
    expect(after?.id).toEqual(expect.any(String));
    await service.createTask({
      ...request(),
      title: 'Depois',
      source: { documentId: document.id, blockId: after?.id ?? null, excerpt: 'Depois da fórmula', expectedVersion: 1 },
    });
    const [task] = (await service.listTasks({ documentId: document.id })).tasks;
    expect(task?.source?.blockAvailable).toBe(true);
    // A save without ids, from a script or another client, gets them too.
    await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Importado',
      content: [paragraph('Sem id')],
    });
    expect((await service.getDocument({ id: document.id })).content[0]?.id).toEqual(expect.any(String));
  });
  it('keeps document text unchanged when the linked task is renamed and completed', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: content('Escrever apresentação'),
    });
    const created = await service.createTask({
      ...request(),
      title: 'Escrever apresentação',
      source: { documentId: document.id, excerpt: 'Escrever apresentação' },
    });
    await service.saveTaskText({
      ...request(),
      id: created.id,
      expectedTextVersion: 1,
      title: 'Publicar apresentação',
      description: [],
    });
    const result = await service.updateTask({
      ...request(),
      id: created.id,
      expectedVersion: 1,
      columnId: INITIAL_COLUMN_IDS.done,
    });
    expect(result.version).toBe(2);
    expect((await service.getTask({ id: created.id })).completedAt).not.toBeNull();
    expect((await service.getDocument({ id: document.id })).plainText).toBe('Escrever apresentação');
    await expect(
      service.updateTask({ ...request(), id: created.id, expectedVersion: 1, dueOn: '2026-12-01' }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });
});
