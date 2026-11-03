import { type Database, tables } from '#core/infra';
import type { TaskRemovalRepository } from '../../application/ports/context.js';
import type { BoardTables } from '../sql/tables.js';

export function taskRemovalRepository(connection: Database): TaskRemovalRepository {
  const db = tables<BoardTables>(connection);
  return {
    async keepTitleInSources(documentId, title) {
      await db
        .updateTable('workspace_task_sources')
        .set({ document_title: title })
        .where('document_id', '=', documentId)
        .execute();
    },
    async deleteTaskRow(id) {
      await db.deleteFrom('workspace_tasks').where('id', '=', id).execute();
    },
  };
}
