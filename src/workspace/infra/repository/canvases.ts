import { type Database, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { CanvasRepository } from '../../application/ports/canvases.js';
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
          // The summary: SQLite counts code points, so an emoji is never cut in half.
          sql<string>`substr(plain_text, 1, 280)`.as('plain_text'),
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
      return (await query.orderBy('updated_at', 'desc').orderBy('id').execute()).map(canvasSummary);
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
