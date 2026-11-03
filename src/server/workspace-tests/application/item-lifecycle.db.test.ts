import { describe, expect, it } from 'vitest';
import { request } from '../../testing/workspace/builders.js';
import { useWorkspaceDb } from '../../testing/workspace/database.js';

for (const kind of ['document', 'drawing'] as const)
  describe(`${kind} lifecycle contract`, () => {
    const workspace = useWorkspaceDb({ start: '2026-11-03T12:00:00Z' });
    for (const archived of [false, true])
      for (const folderGone of [false, true])
        it(`preserves compact acknowledgements with archived=${archived}, folderGone=${folderGone}`, async () => {
          const s = workspace.service;
          const project = await s.createProject({ ...request(), name: 'Contrato' });
          const folder = await s.createFolder({ ...request(), projectId: project.id, name: 'Origem' });
          const create = kind === 'document' ? s.createDocument : s.createCanvas;
          const read = kind === 'document' ? s.getDocument : s.getCanvas;
          const trash = kind === 'document' ? s.deleteDocument : s.deleteCanvas;
          const restore = kind === 'document' ? s.restoreDocument : s.restoreCanvas;
          const created = await create({
            ...request(),
            projectId: project.id,
            folderId: folder.id,
            title: 'Preservado',
          });
          await s.pinItem({ type: kind, id: created.id });
          const input = { ...request(), id: created.id, expectedVersion: created.version };
          const deleted = await trash(input);
          expect(Object.keys(deleted).sort()).toEqual(['id', 'updatedAt', 'version']);
          expect(await trash(input)).toEqual(deleted);
          expect(await read({ id: created.id })).toMatchObject({
            title: 'Preservado',
            folderId: folder.id,
            pinnedAt: null,
            deletedAt: deleted.updatedAt,
          });
          if (folderGone)
            await s.deleteFolder({ ...request(), id: folder.id, expectedVersion: folder.version, withItems: false });
          if (archived)
            await s.updateProject({ ...request(), id: project.id, expectedVersion: project.version, archived: true });
          const restoreInput = { ...request(), id: created.id, expectedVersion: deleted.version };
          const restored = await restore(restoreInput);
          expect(restored).toMatchObject({ id: created.id, version: deleted.version + 1, folderGone });
          expect(Object.keys(restored).sort()).toEqual(['folderGone', 'id', 'updatedAt', 'version']);
          expect(await restore(restoreInput)).toEqual(restored);
          expect(await read({ id: created.id })).toMatchObject({
            title: 'Preservado',
            folderId: folderGone ? null : folder.id,
            pinnedAt: null,
            deletedAt: null,
          });
          await expect(trash({ ...request(), id: created.id, expectedVersion: created.version })).rejects.toMatchObject(
            {
              code: 'VERSION_CONFLICT',
              message: 'Este item mudou em outro dispositivo. Atualize os dados antes de continuar.',
            },
          );
        });

    it('keeps a live item pinned when restore is requested directly', async () => {
      const s = workspace.service;
      const project = await s.createProject({ ...request(), name: 'Fixado' });
      const created = await (kind === 'document' ? s.createDocument : s.createCanvas)({
        ...request(),
        projectId: project.id,
      });
      await s.pinItem({ type: kind, id: created.id });
      const read = kind === 'document' ? s.getDocument : s.getCanvas;
      const before = await read({ id: created.id });
      await (kind === 'document' ? s.restoreDocument : s.restoreCanvas)({
        ...request(),
        id: created.id,
        expectedVersion: created.version,
      });
      expect((await read({ id: created.id })).pinnedAt).toBe(before.pinnedAt);
    });
  });
