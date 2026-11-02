import { type Database, tables } from '@tinyfold/core/infra';
import type { CanvasRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';
import { canvasModel, canvasRow, canvasSummary } from './mappers.js';
import { expectUpdated } from './versioned-update.js';

export function canvasRepository(connection: Database): CanvasRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async listCanvases(input) {
      let query = db
        .selectFrom('workspace_canvases')
        .select([
          'id',
          'project_id',
          'title',
          'plain_text',
          'format_version',
          'version',
          'created_at',
          'updated_at',
          'deleted_at',
          'pinned_at',
          'folder_id',
        ])
        .where('deleted_at', 'is', null);
      if (input.projectId) query = query.where('project_id', '=', input.projectId);
      return (await query.orderBy('updated_at', 'desc').orderBy('id').execute()).map((row) => ({
        ...canvasSummary(row),
        plainText: row.plain_text.slice(0, 280),
      }));
    },
    async findCanvas(id) {
      const row = await db.selectFrom('workspace_canvases').selectAll().where('id', '=', id).executeTakeFirst();
      return row && canvasModel(row);
    },
    async insertCanvas(canvas) {
      await db.insertInto('workspace_canvases').values(canvasRow(canvas)).execute();
    },
    async saveCanvas(canvas, expectedVersion) {
      const result = await db
        .updateTable('workspace_canvases')
        .set(canvasRow(canvas))
        .where('id', '=', canvas.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
  };
}
