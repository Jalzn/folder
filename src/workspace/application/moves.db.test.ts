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
    const answer = { id: document.id, projectId: to.id, folderId: null, version: 2, pinnedAt: null };
    expect(await service.moveItem(moved)).toEqual(answer);
    expect(await service.moveItem(moved)).toEqual(answer);
    expect(
      await service.moveItem({ ...request(), type: 'drawing', id: canvas.id, projectId: to.id, expectedVersion: 1 }),
    ).toEqual({ ...answer, id: canvas.id });

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
    expect((await service.projectNavigation({ projectId: from.id })).tree.total).toBe(0);
  });

  it('takes an item out of its folder when it moves to another project, and refuses a folder there', async () => {
    const folder = await testFolder(service, from.id, 'MCP');
    const there = await testFolder(service, to.id, 'Lá');
    const document = await service.createDocument({ ...request(), projectId: from.id, folderId: folder.id });
    await expect(
      service.moveItem({
        ...request(),
        type: 'document',
        id: document.id,
        projectId: to.id,
        folderId: there.id,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION', message: 'Mova para o projeto antes de escolher a pasta.' });
    await service.moveItem({ ...request(), type: 'document', id: document.id, projectId: to.id, expectedVersion: 1 });
    expect(await service.getDocument({ id: document.id })).toMatchObject({
      projectId: to.id,
      folderId: null,
      version: 2,
    });
  });

  it('files an item in a folder of its project without editing it or asking its version', async () => {
    const mcp = await testFolder(service, from.id, 'MCP');
    const document = await service.createDocument({ ...request(), projectId: from.id, title: 'Plano', content });
    const canvas = await service.createCanvas({ ...request(), projectId: from.id, scene: drawingFixture() });
    await service.saveDocument({ ...request(), id: document.id, expectedVersion: 1, title: 'Plano', content });
    const before = await service.getDocument({ id: document.id });
    const file = (type: 'document' | 'drawing', id: string, folderId: string | null) =>
      service.moveItem({ ...request(), type, id, projectId: from.id, folderId });

    expect(await file('document', document.id, mcp.id)).toEqual({
      id: document.id,
      projectId: from.id,
      folderId: mcp.id,
      version: 2,
      pinnedAt: null,
    });
    expect(await service.getDocument({ id: document.id })).toEqual({ ...before, folderId: mcp.id });
    // An editor still saving with the version it had is not in conflict.
    await service.saveDocument({ ...request(), id: document.id, expectedVersion: 2, title: 'Plano', content });
    expect((await service.getDocument({ id: document.id })).folderId).toBe(mcp.id);
    expect((await file('drawing', canvas.id, mcp.id)).folderId).toBe(mcp.id);
    expect((await file('drawing', canvas.id, null)).folderId).toBeNull();
    // The folder it is in, or no folder at all, changes nothing.
    expect(
      await service.moveItem({ ...request(), type: 'document', id: document.id, projectId: from.id }),
    ).toMatchObject({
      folderId: mcp.id,
      version: 3,
    });
    expect((await file('document', document.id, mcp.id)).version).toBe(3);
  });

  it('keeps the pin when the destination folder has room, and drops it when it has 8', async () => {
    const [full, roomy] = [await testFolder(service, from.id, 'Cheia'), await testFolder(service, from.id, 'Vazia')];
    for (let index = 0; index < 8; index += 1) {
      const filed = await service.createDocument({ ...request(), projectId: from.id, folderId: full.id });
      await service.pinItem({ type: 'document', id: filed.id });
    }
    const [first, second] = [
      await service.createDocument({ ...request(), projectId: from.id }),
      await service.createDocument({ ...request(), projectId: from.id }),
    ];
    const { pinnedAt } = await service.pinItem({ type: 'document', id: first.id });
    await service.pinItem({ type: 'document', id: second.id });
    const file = (id: string, folderId: string) =>
      service.moveItem({ ...request(), type: 'document', id, projectId: from.id, folderId });
    expect((await file(first.id, roomy.id)).pinnedAt).toBe(pinnedAt);
    expect((await file(second.id, full.id)).pinnedAt).toBeNull();
    expect((await service.getDocument({ id: second.id })).pinnedAt).toBeNull();
  });

  it('refuses a deleted folder, a folder of another project and an archived project', async () => {
    const document = await service.createDocument({ ...request(), projectId: from.id });
    const file = (folderId: string) =>
      service.moveItem({ ...request(), type: 'document', id: document.id, projectId: from.id, folderId });
    const gone = await testFolder(service, from.id, 'Excluída');
    await service.deleteFolder({ ...request(), id: gone.id, expectedVersion: 1, withItems: false });
    await expect(file(gone.id)).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'A pasta não está disponível.' });
    await expect(file((await testFolder(service, to.id, 'Alheia')).id)).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'A pasta não é deste projeto.',
    });
    const mcp = await testFolder(service, from.id, 'MCP');
    await service.updateProject({ ...request(), id: from.id, expectedVersion: 1, archived: true });
    await expect(file(mcp.id)).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Desarquive o projeto antes de mudar as pastas.',
    });
  });

  it('refuses an archived or missing project, a stale or missing version and a trashed item, and stays put', async () => {
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
    await expect(move({ expectedVersion: 2 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      service.moveItem({ ...request(), type: 'document', id: document.id, projectId: to.id }),
    ).rejects.toMatchObject({ code: 'VALIDATION', message: 'Informe a versão para mudar de projeto.' });
    // Its own project changes nothing, whatever the version says.
    const here = { id: document.id, projectId: from.id, folderId: null, version: 1, pinnedAt: null };
    expect(await move({ projectId: from.id })).toEqual(here);
    expect(await move({ projectId: from.id, expectedVersion: 7 })).toEqual(here);
    const trashed = await service.deleteDocument({ ...request(), id: document.id, expectedVersion: 1 });
    await expect(move({ projectId: from.id, expectedVersion: trashed.version })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect((await service.getDocument({ id: document.id })).deletedAt).toBe(trashed.updatedAt);
    expect((await service.listDocuments({ deleted: true }))[0]).toMatchObject({ projectId: from.id, version: 2 });
  });
});
