import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { createAccessTokens } from '../src/auth/index.js';
import { migrate } from '../src/core/infra/index.js';
import { modules } from '../src/server/modules.js';
import { createWorkspaceService } from '../src/workspace/index.js';
import { drawingFixture } from '../src/workspace/testing/canvas-scenes.js';
import { pngImage } from '../src/workspace/testing/png.js';
import { backupRoundTrip } from './testing/backup-round-trip.js';

test('restores access tokens and drawing previews from a live SQLite backup', async () => {
  const roundTrip = await backupRoundTrip('tinyfold-mcp-backup-');
  const { db } = roundTrip;
  try {
    await migrate(db, modules);
    const tokens = createAccessTokens(db);
    const created = await tokens.create({ name: 'Claude Code' });
    const workspace = createWorkspaceService(db);
    const project = await workspace.createProject({ requestId: randomUUID(), name: 'Fluxos' });
    const canvas = await workspace.createCanvas({
      requestId: randomUUID(),
      projectId: project.id,
      title: 'Fluxo',
      scene: drawingFixture(),
    });
    await workspace.saveCanvasPreview({ id: canvas.id, version: 1, png: pngImage(640, 480) });
    await roundTrip.backup();
    await tokens.revoke({ id: created.accessToken.id });
    const restoredDb = await roundTrip.restore();
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
    await roundTrip.dispose();
  }
});
