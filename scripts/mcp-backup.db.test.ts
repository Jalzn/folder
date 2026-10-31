import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createAccessTokens } from '../src/auth/index.js';
import { createDatabase, migrate } from '../src/core/infra/index.js';
import { modules } from '../src/server/modules.js';
import { createWorkspaceService } from '../src/workspace/index.js';
import { drawingFixture } from '../src/workspace/testing/canvas-scenes.js';
import { pngImage } from '../src/workspace/testing/png.js';
import { snapshot } from './storage.js';

test('restores access tokens and drawing previews from a live SQLite backup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tinyfold-mcp-backup-'));
  const source = join(directory, 'source.sqlite');
  const backup = join(directory, 'backup.sqlite');
  const restored = join(directory, 'restored.sqlite');
  const db = createDatabase(source);
  try {
    await migrate(db, modules);
    const tokens = createAccessTokens(db);
    const created = await tokens.create({ name: 'Claude Code' });
    const workspace = createWorkspaceService(db);
    const canvas = await workspace.createCanvas({ requestId: randomUUID(), title: 'Fluxo', scene: drawingFixture() });
    await workspace.saveCanvasPreview({ id: canvas.id, version: 1, png: pngImage(640, 480) });
    await snapshot(source, backup);
    await tokens.revoke({ id: created.accessToken.id });
    await snapshot(backup, restored);
    const restoredDb = createDatabase(restored);
    try {
      expect(await migrate(restoredDb, modules)).toEqual([]);
      const copy = createAccessTokens(restoredDb);
      expect(await copy.list()).toEqual([created.accessToken]);
      expect(await copy.authenticate(created.token)).toEqual({ id: created.accessToken.id, scope: 'read' });
      expect((await createWorkspaceService(restoredDb).getCanvas({ id: canvas.id })).previewVersion).toBe(1);
      expect(await tokens.authenticate(created.token)).toBeUndefined();
    } finally {
      await restoredDb.destroy();
    }
  } finally {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  }
});
