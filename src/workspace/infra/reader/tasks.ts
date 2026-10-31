import { type Kysely, sql } from 'kysely';
import type { TaskListing, WorkspaceReader } from '../../application/reading/ports.js';
import type { DocumentBlock } from '../../domain/models.js';
import { matchesAllTerms, searchText } from '../../domain/search-text.js';
import { excerptPresent } from '../../domain/task-source.js';
import type { WorkspaceTables } from '../db.js';
import { columnRank, projectColumns, projectReference, sourceDocument } from './shared.js';

type TaskReads = Pick<WorkspaceReader, 'tasks' | 'task'>;

export function taskReads(db: Kysely<WorkspaceTables>): TaskReads {
  const withSource = () =>
    db
      .selectFrom('workspace_tasks as item')
      .leftJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .leftJoin('workspace_task_sources as source', 'source.task_id', 'item.id')
      .leftJoin('workspace_documents as document', 'document.id', 'source.document_id')
      .select(['item.id', 'item.title', 'item.status', 'item.position', 'item.created_at', 'item.updated_at'])
      .select(projectColumns)
      .select([
        'source.document_id',
        'source.block_id',
        'source.excerpt',
        'document.title as document_title',
        'document.deleted_at as document_deleted_at',
      ])
      .where('item.deleted_at', 'is', null);

  return {
    async tasks(query) {
      let select = withSource().orderBy(columnRank).orderBy('item.position').orderBy('item.id');
      if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
      if (query.statuses?.length) select = select.where('item.status', 'in', [...query.statuses]);
      const after = query.after;
      if (after)
        select = select.where(
          sql<boolean>`(${columnRank}, item.position, item.id) > (${after.columnRank}, ${after.position}, ${after.id})`,
        );
      // Titles have no stored search column, so the normalized match runs here, after the query.
      if (!query.terms.length) select = select.limit(query.limit + 1);
      const rows = await select.execute();
      const matching = query.terms.length
        ? rows.filter((row) => matchesAllTerms(searchText(row.title), query.terms)).slice(0, query.limit + 1)
        : rows;
      const items = matching.slice(0, query.limit).map(
        (row): TaskListing => ({
          id: row.id,
          title: row.title,
          status: row.status,
          position: row.position,
          ...projectReference(row),
          updatedAt: row.updated_at,
          source: row.document_id
            ? { documentId: row.document_id, ...sourceDocument(row.document_title, row.document_deleted_at) }
            : null,
        }),
      );
      return { items, hasMore: matching.length > query.limit };
    },

    async task(id) {
      const row = await withSource()
        .select(['document.content as document_content', 'document.plain_text as document_plain_text'])
        .where('item.id', '=', id)
        .executeTakeFirst();
      if (!row) return undefined;
      const { document_id: documentId, excerpt } = row;
      const document = sourceDocument(row.document_title, row.document_deleted_at);
      const blockAvailable =
        document.available &&
        excerpt !== null &&
        excerptPresent(
          {
            content: JSON.parse(row.document_content ?? '[]') as DocumentBlock[],
            plainText: row.document_plain_text ?? '',
          },
          row.block_id,
          excerpt,
        );
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        ...projectReference(row),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        position: row.position,
        source:
          documentId && excerpt !== null
            ? { documentId, blockId: row.block_id, excerpt, ...document, blockAvailable }
            : null,
      };
    },
  };
}
