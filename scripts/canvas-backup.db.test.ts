import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createDatabase, migrate } from '../src/core/infra/index.js';
import { modules } from '../src/server/modules.js';
import { emptyCanvasScene } from '../src/workspace/domain/index.js';
import { createWorkspaceService } from '../src/workspace/index.js';
import { snapshot } from './storage.js';

test('restores canvas scenes and project links independently from a live SQLite backup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tinyfold-canvas-backup-'));
  const source = join(directory, 'source.sqlite');
  const backup = join(directory, 'backup.sqlite');
  const restored = join(directory, 'restored.sqlite');
  const db = createDatabase(source);
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
    await snapshot(source, backup);
    await workspace.saveCanvas({
      requestId: randomUUID(),
      id: ack.id,
      expectedVersion: ack.version,
      title: 'Alterado depois da cópia',
      scene: emptyCanvasScene(),
    });
    await snapshot(backup, restored);
    const restoredDb = createDatabase(restored);
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
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  }
});
