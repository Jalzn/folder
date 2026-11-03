import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { coreModule, type Database } from '#core/infra';
import { useTempDatabase } from '#core/testing';
import type { Project } from '#projects/domain';
import type { DocumentBlock } from '#rich-text/domain';
import { workspaceModule } from '../../../workspace/infra/module.js';
import { testProject } from '../../testing/workspace/projects.js';
import { createWorkspaceService } from '../../workspace/service.js';

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
  it('lists live documents and drawings whatever query or deleted a client still sends (decision 5)', async () => {
    const live = await service.createDocument({ ...request(), projectId: project.id, title: 'Plano' });
    const other = await service.createDocument({ ...request(), projectId: project.id, title: 'Outro' });
    const trashed = await service.createDocument({ ...request(), projectId: project.id, title: 'Plano antigo' });
    await service.deleteDocument({ ...request(), id: trashed.id, expectedVersion: 1 });
    const drawing = await service.createCanvas({ ...request(), projectId: project.id, title: 'Plano' });
    const old = { query: 'Plano', deleted: true } as Record<string, unknown>;
    expect((await service.listDocuments({ projectId: project.id, ...old })).map((item) => item.id).sort()).toEqual(
      [live.id, other.id].sort(),
    );
    expect((await service.listCanvases({ projectId: project.id, ...old })).map((item) => item.id)).toEqual([
      drawing.id,
    ]);
  });
  it('refuses a search cursor it did not give with VALIDATION, as the completed tasks do (decision 3)', async () => {
    const refused = { code: 'VALIDATION', message: 'Cursor inválido. Repita a consulta sem cursor.' };
    await expect(service.search({ cursor: 'o:40' })).rejects.toMatchObject(refused);
    await expect(service.listCompletedTasks({ projectId: project.id, cursor: 'o:40' })).rejects.toMatchObject(refused);
  });
  it('searches accented text and treats SQL wildcard characters literally', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Ideias de ação',
      content: content('Referências para o portfólio: 100% pessoal'),
    });
    expect((await service.search({ query: 'REFERENCIAS', types: ['document'] })).items.map((item) => item.id)).toEqual([
      document.id,
    ]);
    expect((await service.search({ query: '100%', types: ['document'] })).items.map((item) => item.id)).toEqual([
      document.id,
    ]);
  });
});
