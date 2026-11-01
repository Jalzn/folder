import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DocumentBlock, Project } from '../domain/models.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { testFolder } from '../testing/folders.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });
const content: DocumentBlock[] = [
  { id: 'b', type: 'paragraph', content: [{ type: 'text', text: 'Texto', styles: {} }] },
];

describe('moving items between projects', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let from: Project;
  let to: Project;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-moves-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    let now = new Date('2026-10-31T12:00:00Z');
    service = createWorkspaceService(db, () => {
      now = new Date(now.getTime() + 1000);
      return now;
    });
    from = await testProject(service, 'Origem');
    to = await testProject(service, 'Destino');
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  it('moves a document and a drawing without editing them, and unpins them', async () => {
    const document = await service.createDocument({ ...request(), projectId: from.id, title: 'Plano', content });
    const canvas = await service.createCanvas({
      ...request(),
      projectId: from.id,
      title: 'Fluxo',
      scene: drawingFixture(),
    });
    const later = await service.createDocument({ ...request(), projectId: to.id, title: 'Depois' });
    await service.pinItem({ type: 'document', id: document.id });
    await service.pinItem({ type: 'drawing', id: canvas.id });
    const [documentBefore, canvasBefore] = [
      await service.getDocument({ id: document.id }),
      await service.getCanvas({ id: canvas.id }),
    ];

    const moved = { ...request(), type: 'document' as const, id: document.id, projectId: to.id, expectedVersion: 1 };
    expect(await service.moveItem(moved)).toEqual({ id: document.id, projectId: to.id, version: 2 });
    expect(await service.moveItem(moved)).toEqual({ id: document.id, projectId: to.id, version: 2 });
    expect(
      await service.moveItem({ ...request(), type: 'drawing', id: canvas.id, projectId: to.id, expectedVersion: 1 }),
    ).toEqual({ id: canvas.id, projectId: to.id, version: 2 });

    expect(await service.getDocument({ id: document.id })).toEqual({
      ...documentBefore,
      projectId: to.id,
      version: 2,
      pinnedAt: null,
    });
    const canvasAfter = await service.getCanvas({ id: canvas.id });
    expect(canvasAfter).toMatchObject({ projectId: to.id, version: 2, pinnedAt: null });
    expect({ ...canvasAfter, projectId: from.id, version: 1, pinnedAt: canvasBefore.pinnedAt }).toEqual(canvasBefore);
    // Not an edit: the document edited later is still the last one edited.
    const overview = await service.projectOverview({ projectId: to.id });
    expect(overview.recent.map((item) => item.title)).toEqual(['Depois', 'Fluxo', 'Plano']);
    expect(overview.lastEdited?.id).toBe(later.id);
    expect((await service.projectNavigation({ projectId: from.id })).documents.total).toBe(0);
  });

  it('takes an item out of its folder when it moves to another project', async () => {
    const folder = await testFolder(service, from.id, 'MCP');
    const document = await service.createDocument({ ...request(), projectId: from.id, folderId: folder.id });
    await service.moveItem({ ...request(), type: 'document', id: document.id, projectId: to.id, expectedVersion: 1 });
    expect(await service.getDocument({ id: document.id })).toMatchObject({
      projectId: to.id,
      folderId: null,
      version: 2,
    });
  });

  it('refuses an archived or missing project, a stale version and a trashed item, and stays put', async () => {
    const document = await service.createDocument({ ...request(), projectId: from.id, title: 'Plano' });
    const move = (fields: { projectId?: string; expectedVersion?: number; id?: string }) =>
      service.moveItem({
        ...request(),
        type: 'document',
        id: document.id,
        projectId: to.id,
        expectedVersion: 1,
        ...fields,
      });
    await service.updateProject({ ...request(), id: to.id, expectedVersion: 1, archived: true });
    await expect(move({})).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Desarquive o projeto antes de adicionar conteúdo a ele.',
    });
    await expect(move({ projectId: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(move({ projectId: from.id, expectedVersion: 2 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(await move({ projectId: from.id })).toEqual({ id: document.id, projectId: from.id, version: 1 });
    const trashed = await service.deleteDocument({ ...request(), id: document.id, expectedVersion: 1 });
    await expect(move({ projectId: from.id, expectedVersion: trashed.version })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await service.getDocument({ id: document.id }).catch((error) => error.code)).toBe('NOT_FOUND');
    expect((await service.listDocuments({ deleted: true }))[0]).toMatchObject({ projectId: from.id, version: 2 });
  });
});
