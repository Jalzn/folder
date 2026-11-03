import { randomUUID } from 'node:crypto';
import { coreModule, createDatabase, type Database } from '@tinyfold/core/infra';
import { useTempDatabase } from '@tinyfold/core/testing';
import { documentsParticipant } from '@tinyfold/documents/composition';
import type { Project } from '@tinyfold/projects/domain';
import type { DocumentBlock } from '@tinyfold/rich-text/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { workspaceModule } from '../../../workspace/infra/module.js';
import { testProject } from '../../testing/workspace/projects.js';
import { composeWorkspace } from '../../workspace/operations.js';
import { createWorkspaceService } from '../../workspace/service.js';

const request = () => ({ requestId: randomUUID() });
const content = (text: string, blockId = 'block-one'): DocumentBlock[] => [
  { id: blockId, type: 'paragraph', content: [{ type: 'text', text, styles: {} }], children: [] },
];
describe('workspace persistence and adversarial cases', () => {
  const database = useTempDatabase([coreModule, workspaceModule]);
  let filename: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  beforeEach(async () => {
    filename = database.path;
    db = database.db;
    service = createWorkspaceService(db);
    project = await testProject(service);
  });
  it('says a version conflict in one sentence, before or during the UPDATE (decision 7)', async () => {
    const sentence = 'Este item mudou em outro dispositivo. Atualize os dados antes de continuar.';
    const document = await service.createDocument({ ...request(), projectId: project.id, content: content('Texto') });
    const save = { ...request(), id: document.id, expectedVersion: 2, title: 'Outro', content: content('Outro') };
    await expect(service.saveDocument(save)).rejects.toMatchObject({ code: 'VERSION_CONFLICT', message: sentence });
    // The UPDATE's own check, for a write that read the version before another device saved.
    const stored = await service.getDocument({ id: document.id });
    const composed = composeWorkspace(db);
    await expect(
      composed.unit.writeWithoutRequestRecord((scope) =>
        documentsParticipant(composed.modules.documents, scope).repository.saveDocument({ ...stored, version: 3 }, 2),
      ),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      message: sentence,
    });
  });
  it('rejects stale document changes from another database connection', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: content('Original'),
    });
    const second = createDatabase(filename);
    try {
      const other = createWorkspaceService(second);
      const snapshot = await other.getDocument({ id: document.id });
      await service.saveDocument({
        ...request(),
        id: document.id,
        expectedVersion: 1,
        title: 'Computador',
        content: content('Versão nova'),
      });
      await expect(
        other.saveDocument({
          ...request(),
          id: document.id,
          expectedVersion: snapshot.version,
          title: 'Celular',
          content: content('Rascunho antigo'),
        }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
      expect((await other.getDocument({ id: document.id })).plainText).toBe('Versão nova');
    } finally {
      await second.destroy();
    }
  });
  it('serializes competing edits and commits only one expected revision', async () => {
    const document = await service.createDocument({ ...request(), projectId: project.id });
    const results = await Promise.allSettled(
      ['A', 'B'].map((title) =>
        service.saveDocument({ ...request(), id: document.id, expectedVersion: 1, title, content: content(title) }),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: { code: 'VERSION_CONFLICT' } });
    expect((await service.getDocument({ id: document.id })).version).toBe(2);
  });
});
