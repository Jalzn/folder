import type { Kysely } from 'kysely';
import type { WorkspaceReader } from '../../application/reading/ports.js';
import type { DocumentBlock } from '../../domain/models.js';
import type { WorkspaceTables } from '../db.js';
import { columnRank, projectColumns, projectReference } from './shared.js';

type DocumentReads = Pick<WorkspaceReader, 'documentForReading' | 'tasksFromDocument'>;

export function documentReads(db: Kysely<WorkspaceTables>): DocumentReads {
  return {
    async documentForReading(id) {
      const row = await db
        .selectFrom('workspace_documents as item')
        .leftJoin('workspace_projects as project', 'project.id', 'item.project_id')
        .select(['item.id', 'item.title', 'item.content', 'item.version', 'item.created_at', 'item.updated_at'])
        .select(projectColumns)
        .where('item.id', '=', id)
        .where('item.deleted_at', 'is', null)
        .executeTakeFirst();
      return (
        row && {
          id: row.id,
          title: row.title,
          ...projectReference(row),
          content: JSON.parse(row.content) as DocumentBlock[],
          version: row.version,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      );
    },
    tasksFromDocument(documentId, limit) {
      return db
        .selectFrom('workspace_task_sources as source')
        .innerJoin('workspace_tasks as item', 'item.id', 'source.task_id')
        .select(['item.id', 'item.title', 'item.status'])
        .where('source.document_id', '=', documentId)
        .where('item.deleted_at', 'is', null)
        .orderBy(columnRank)
        .orderBy('item.position')
        .orderBy('item.id')
        .limit(limit)
        .execute();
    },
  };
}
