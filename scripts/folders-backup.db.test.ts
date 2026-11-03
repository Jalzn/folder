import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { expect, test } from 'vitest';
import { migrate } from '../src/core/infra/index.js';
import { modules } from '../src/server/modules.js';
import { createWorkspaceService } from '../src/workspace/index.js';
import { backupRoundTrip } from './testing/backup-round-trip.js';

const request = () => ({ requestId: randomUUID() });

test('restores active and deleted folders, filed items and the folder rules from a live backup', async () => {
  const roundTrip = await backupRoundTrip('tinyfold-folders-backup-');
  const { db, restored } = roundTrip;
  try {
    await migrate(db, modules);
    const workspace = createWorkspaceService(db);
    const project = await workspace.createProject({ ...request(), name: 'Tinyfold' });
    const mcp = await workspace.createFolder({ ...request(), projectId: project.id, name: 'MCP' });
    const old = await workspace.createFolder({ ...request(), projectId: project.id, name: 'Antiga' });
    const filed = await workspace.createDocument({
      ...request(),
      projectId: project.id,
      folderId: mcp.id,
      title: 'MCP somente leitura',
    });
    const drawing = await workspace.createCanvas({
      ...request(),
      projectId: project.id,
      folderId: mcp.id,
      title: 'Fluxo',
    });
    await workspace.deleteFolder({ ...request(), id: old.id, expectedVersion: old.version, withItems: false });
    const folders = await workspace.listFolders({});
    await roundTrip.backup();

    // Changes after the backup stay out of it.
    await workspace.moveItem({ ...request(), type: 'document', id: filed.id, projectId: project.id, folderId: null });
    const restoredDb = await roundTrip.restore();
    try {
      expect(await migrate(restoredDb, modules)).toEqual([]);
      const copy = createWorkspaceService(restoredDb);
      expect(await copy.listFolders({})).toEqual(folders);
      expect(folders.folders.map((folder) => [folder.name, folder.position])).toEqual([['MCP', 0]]);
      expect((await copy.getDocument({ id: filed.id })).folderId).toBe(mcp.id);
      expect((await copy.getCanvas({ id: drawing.id })).folderId).toBe(mcp.id);
      expect((await workspace.getDocument({ id: filed.id })).folderId).toBeNull();
    } finally {
      await restoredDb.destroy();
    }

    // The deleted folder, the unique index and the triggers come along in the new file.
    const raw = new Database(restored);
    try {
      expect(raw.prepare('SELECT deleted_at FROM workspace_folders WHERE id = ?').get(old.id)).toEqual({
        deleted_at: expect.any(String),
      });
      const now = new Date().toISOString();
      const folder = raw.prepare(
        `INSERT INTO workspace_folders (id, project_id, name, name_key, position, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
      );
      expect(() => folder.run(randomUUID(), project.id, 'mcp', 'mcp', now, now)).toThrow('UNIQUE constraint failed');
      // A deleted folder's name is free again.
      expect(() => folder.run(randomUUID(), project.id, 'Antiga', 'antiga', now, now)).not.toThrow();
      expect(() =>
        raw.prepare('UPDATE workspace_documents SET folder_id = ? WHERE id = ?').run(old.id, filed.id),
      ).toThrow('workspace_documents.folder_id must be a folder of its project, active for a live item');
      expect(() => raw.prepare('UPDATE workspace_folders SET deleted_at = ? WHERE id = ?').run(now, mcp.id)).toThrow(
        'workspace_folders cannot be deleted with live items',
      );
    } finally {
      raw.close();
    }
  } finally {
    await roundTrip.dispose();
  }
});
