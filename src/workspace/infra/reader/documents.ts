import type { Kysely } from 'kysely';
import type { WorkspaceReader } from '../../application/reading/ports.js';
import type { DocumentBlock } from '../../domain/models.js';
import type { WorkspaceTables } from '../db.js';
import { taskStatuses } from '../task-statuses.js';
import { folderColumns, folderReference } from './folders.js';
import { columnRank, projectColumns, projectReference } from './shared.js';

type DocumentReads = Pick<WorkspaceReader, 'documentForReading' | 'tasksFromDocument'>;

export function documentReads(db: Kysely<WorkspaceTables>): DocumentReads {
  return {
    async documentForReading(id) {
      const row = await db
        .selectFrom('workspace_documents as item')
        .innerJoin('workspace_projects as project', 'project.id', 'item.project_id')
        .leftJoin('workspace_folders as folder', 'folder.id', 'item.folder_id')
        .select(['item.id', 'item.title', 'item.content', 'item.version', 'item.created_at', 'item.updated_at'])
        .select(projectColumns)
        .select(folderColumns)
        .where('item.id', '=', id)
        .where('item.deleted_at', 'is', null)
        .executeTakeFirst();
      return (
        row && {
          id: row.id,
          title: row.title,
          ...projectReference(row),
          folder: folderReference(row),
          content: JSON.parse(row.content) as DocumentBlock[],
          version: row.version,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      );
    },
    async tasksFromDocument(documentId, limit) {
      const fromDocument = db
        .selectFrom('workspace_task_sources as source')
        .innerJoin('workspace_tasks as item', 'item.id', 'source.task_id')
        .innerJoin('workspace_columns as col', 'col.id', 'item.column_id')
        .where('source.document_id', '=', documentId)
        .where('item.deleted_at', 'is', null);
      const [items, count] = await Promise.all([
        fromDocument
          .select(['item.id', 'item.title', 'item.column_id'])
          .orderBy(columnRank)
          .orderBy('item.position')
          .orderBy('item.id')
          .limit(limit)
          .execute(),
        fromDocument.select(({ fn }) => fn.countAll<number>().as('total')).executeTakeFirstOrThrow(),
      ]);
      const { statusOf } = await taskStatuses(db);
      return {
        items: items.map((item) => ({ id: item.id, title: item.title, status: statusOf(item.column_id) })),
        total: count.total,
      };
    },
  };
}
