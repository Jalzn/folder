import { type Database, tables } from '@tinyfold/core/infra';
import type { CanvasPreviewRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';

export function canvasPreviewRepository(connection: Database): CanvasPreviewRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async canvasState(id) {
      const row = await db
        .selectFrom('workspace_canvases')
        .select(['version', 'deleted_at'])
        .where('id', '=', id)
        .executeTakeFirst();
      return row && { version: row.version, deletedAt: row.deleted_at };
    },
    async canvasPreviewVersion(canvasId) {
      const row = await db
        .selectFrom('workspace_canvas_previews')
        .select('scene_version')
        .where('canvas_id', '=', canvasId)
        .executeTakeFirst();
      return row?.scene_version ?? null;
    },
    async saveCanvasPreview(preview) {
      const values = {
        scene_version: preview.sceneVersion,
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
