import { type Database, tables } from '@tinyfold/core/infra';
import type { TrashRepository } from '../../application/ports/trash.js';
import type { WorkspaceTables } from '../db.js';

export function trashRepository(connection: Database): TrashRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async keepTitleInSources(documentId, title) {
      await db
        .updateTable('workspace_task_sources')
        .set({ document_title: title })
        .where('document_id', '=', documentId)
        .execute();
    },
    // ON DELETE SET NULL leaves the task sources without the document.
    async deleteDocumentRow(id) {
      await db.deleteFrom('workspace_documents').where('id', '=', id).execute();
    },
    // ON DELETE CASCADE takes the preview.
    async deleteCanvasRow(id) {
      await db.deleteFrom('workspace_canvases').where('id', '=', id).execute();
    },
    // ON DELETE CASCADE takes the source.
    async deleteTaskRow(id) {
      await db.deleteFrom('workspace_tasks').where('id', '=', id).execute();
    },
  };
}
