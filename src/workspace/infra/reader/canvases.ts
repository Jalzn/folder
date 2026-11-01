import type { Kysely } from 'kysely';
import type { WorkspaceReader } from '../../application/reading/ports.js';
import type { CanvasScene } from '../../domain/canvas.js';
import type { WorkspaceTables } from '../db.js';
import { folderColumns, folderReference } from './folders.js';
import { bytes, projectColumns, projectReference } from './shared.js';

type CanvasReads = Pick<WorkspaceReader, 'canvasForReading'>;

export function canvasReads(db: Kysely<WorkspaceTables>): CanvasReads {
  return {
    async canvasForReading(id) {
      const row = await db
        .selectFrom('workspace_canvases as item')
        .innerJoin('workspace_projects as project', 'project.id', 'item.project_id')
        .leftJoin('workspace_canvas_previews as preview', 'preview.canvas_id', 'item.id')
        .leftJoin('workspace_folders as folder', 'folder.id', 'item.folder_id')
        .select(['item.id', 'item.title', 'item.scene', 'item.version', 'item.updated_at'])
        .select(projectColumns)
        .select(folderColumns)
        .select([
          'preview.scene_version as preview_version',
          'preview.scene_fingerprint as preview_fingerprint',
          'preview.width as preview_width',
          'preview.height as preview_height',
          'preview.png as preview_png',
        ])
        .where('item.id', '=', id)
        .where('item.deleted_at', 'is', null)
        .executeTakeFirst();
      if (!row) return undefined;
      const { preview_version: sceneVersion, preview_fingerprint: sceneFingerprint } = row;
      const { preview_width: width, preview_height: height, preview_png: png } = row;
      return {
        id: row.id,
        title: row.title,
        ...projectReference(row),
        folder: folderReference(row),
        scene: JSON.parse(row.scene) as CanvasScene,
        version: row.version,
        updatedAt: row.updated_at,
        preview:
          sceneVersion !== null && width !== null && height !== null && png !== null
            ? { sceneVersion, sceneFingerprint, width, height, png: bytes(png) }
            : null,
      };
    },
  };
}
