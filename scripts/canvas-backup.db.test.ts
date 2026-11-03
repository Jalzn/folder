import { randomUUID } from 'node:crypto';
import { emptyCanvasScene } from '@tinyfold/drawings/domain';
import { expect, test } from 'vitest';
import { migrate } from '../src/core/infra/index.js';
import { modules } from '../src/server/modules.js';
import { createWorkspaceService } from '../src/server/workspace/index.js';
import { backupRoundTrip } from './testing/backup-round-trip.js';

test('restores canvas scenes and project links independently from a live SQLite backup', async () => {
  const roundTrip = await backupRoundTrip('tinyfold-canvas-backup-');
  const { db } = roundTrip;
  try {
    await migrate(db, modules);
    const workspace = createWorkspaceService(db);
    const project = await workspace.createProject({ requestId: randomUUID(), name: 'Fluxos visuais' });
    const scene = { ...emptyCanvasScene(), appState: { viewBackgroundColor: '#e8f1ff' } };
    const ack = await workspace.createCanvas({
      requestId: randomUUID(),
      title: 'Rascunho para preservar',
      projectId: project.id,
      scene,
    });
    const original = await workspace.getCanvas({ id: ack.id });
    await roundTrip.backup();
    await workspace.saveCanvas({
      requestId: randomUUID(),
      id: ack.id,
      expectedVersion: ack.version,
      title: 'Alterado depois da cópia',
      scene: emptyCanvasScene(),
    });
    const restoredDb = await roundTrip.restore();
    try {
      expect(await migrate(restoredDb, modules)).toEqual([]);
      const copy = createWorkspaceService(restoredDb);
      expect(await copy.getCanvas({ id: ack.id })).toEqual(original);
      expect(await copy.listProjects()).toEqual([{ ...project, overdueTasks: 0 }]);
      expect((await workspace.getCanvas({ id: ack.id })).title).toBe('Alterado depois da cópia');
    } finally {
      await restoredDb.destroy();
    }
  } finally {
    await roundTrip.dispose();
  }
});
