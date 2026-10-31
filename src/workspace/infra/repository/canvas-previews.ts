import { type Database, tables } from '@tinyfold/core/infra';
import type { CanvasPreviewRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';

export function canvasPreviewRepository(connection: Database): CanvasPreviewRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async canvasPreview(canvasId) {
      const row = await db
        .selectFrom('workspace_canvas_previews')
        .select(['scene_version', 'scene_fingerprint'])
        .where('canvas_id', '=', canvasId)
        .executeTakeFirst();
      return row && { sceneVersion: row.scene_version, sceneFingerprint: row.scene_fingerprint };
    },
    async saveCanvasPreview(preview) {
      const values = {
        scene_version: preview.sceneVersion,
        scene_fingerprint: preview.sceneFingerprint,
        png: preview.png,
        width: preview.width,
        height: preview.height,
        created_at: preview.createdAt,
      };
      await db
        .insertInto('workspace_canvas_previews')
        .values({ canvas_id: preview.canvasId, ...values })
        .onConflict((conflict) => conflict.column('canvas_id').doUpdateSet(values))
        .execute();
    },
  };
}
