import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { coreModule, type Database } from '#core/infra';
import { useTempDatabase } from '#core/testing';
import type { Project } from '#projects/domain';
import { workspaceModule } from '../../../workspace/infra/module.js';
import { testFolder } from '../../testing/workspace/folders.js';
import { testProject } from '../../testing/workspace/projects.js';
import { createWorkspaceService } from '../../workspace/service.js';

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
  it('creates documents and drawings in an active folder of their project, or at the root', async () => {
    const other = await testProject(service, 'Outro');
    const folder = await testFolder(service, project.id, 'MCP');
    const document = await service.createDocument({ ...request(), projectId: project.id, folderId: folder.id });
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, folderId: folder.id });
    const loose = await service.createDocument({ ...request(), projectId: project.id });
    expect((await service.getDocument({ id: document.id })).folderId).toBe(folder.id);
    expect((await service.getCanvas({ id: canvas.id })).folderId).toBe(folder.id);
    expect((await service.getDocument({ id: loose.id })).folderId).toBeNull();
    expect((await service.listDocuments({ projectId: project.id })).map((item) => item.folderId).sort()).toEqual([
      folder.id,
      null,
    ]);
    // A save keeps the folder.
    await service.saveDocument({ ...request(), id: document.id, expectedVersion: 1, title: 'Plano', content: [] });
    expect((await service.getDocument({ id: document.id })).folderId).toBe(folder.id);

    const elsewhere = await testFolder(service, other.id, 'Alheia');
    for (const create of [
      () => service.createDocument({ ...request(), projectId: project.id, folderId: elsewhere.id }),
      () => service.createCanvas({ ...request(), projectId: project.id, folderId: elsewhere.id }),
    ])
      await expect(create()).rejects.toMatchObject({ code: 'VALIDATION', message: 'A pasta não é deste projeto.' });
    const deleted = await testFolder(service, project.id, 'Excluída');
    await service.deleteFolder({ ...request(), id: deleted.id, expectedVersion: 1, withItems: false });
    for (const folderId of [deleted.id, randomUUID()])
      await expect(service.createDocument({ ...request(), projectId: project.id, folderId })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'A pasta não está disponível.',
      });
  });
  it('assigns and archives projects without losing documents', async () => {
    const site = await service.createProject({ ...request(), name: 'Site pessoal' });
    const document = await service.createDocument({ ...request(), projectId: site.id });
    await service.updateProject({ ...request(), id: site.id, expectedVersion: 1, archived: true });
    expect(await service.listProjects({})).toEqual([{ ...project, overdueTasks: 0 }]);
    expect(await service.listProjects({ includeArchived: true })).toHaveLength(2);
    expect(await service.listDocuments({ projectId: site.id })).toHaveLength(1);
    // Existing writing can continue, while new assignments require an active project.
    await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Ainda acessível',
      content: [],
    });
    await expect(service.createDocument({ ...request(), projectId: site.id })).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
    });
    await expect(service.createDocument({ ...request(), projectId: randomUUID() })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
