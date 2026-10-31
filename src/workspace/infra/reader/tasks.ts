import { type Kysely, sql } from 'kysely';
import type { TaskListing, WorkspaceReader } from '../../application/reading/ports.js';
import type { DocumentBlock } from '../../domain/models.js';
import { matchesAllTerms, searchText } from '../../domain/search-text.js';
import { excerptPresent } from '../../domain/task-source.js';
import type { WorkspaceTables } from '../db.js';
import { columnRank, projectColumns, projectReference, sourceColumns, sourceDocument } from './shared.js';

type TaskReads = Pick<WorkspaceReader, 'tasks' | 'task' | 'boardRevision'>;

/** The left join finds a source row when the task has one: every source keeps an excerpt and a title. */
const hasSource = <Row extends { excerpt: string | null; kept_title: string | null }>(
  row: Row,
): row is Row & { excerpt: string; kept_title: string } => row.excerpt !== null && row.kept_title !== null;

export function taskReads(db: Kysely<WorkspaceTables>): TaskReads {
  const withSource = () =>
    db
      .selectFrom('workspace_tasks as item')
      .innerJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .leftJoin('workspace_task_sources as source', 'source.task_id', 'item.id')
      .leftJoin('workspace_documents as document', 'document.id', 'source.document_id')
      .select(['item.id', 'item.title', 'item.status', 'item.position', 'item.created_at', 'item.updated_at'])
      .select(projectColumns)
      .select(sourceColumns)
      .where('item.deleted_at', 'is', null);

  return {
    async boardRevision() {
      const state = await db
        .selectFrom('workspace_state')
        .select('board_revision')
        .where('id', '=', 1)
        .executeTakeFirstOrThrow();
      return state.board_revision;
    },

    async tasks(query) {
      let select = withSource().orderBy(columnRank).orderBy('item.position').orderBy('item.id');
      if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
      if (query.documentId) select = select.where('source.document_id', '=', query.documentId);
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
          source: hasSource(row) ? sourceDocument(row) : null,
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
      const task = {
        id: row.id,
        title: row.title,
        status: row.status,
        ...projectReference(row),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        position: row.position,
      };
      if (!hasSource(row)) return { ...task, source: null };
      const document = sourceDocument(row);
      const blockAvailable =
        document.available &&
        excerptPresent(
          {
            content: JSON.parse(row.document_content ?? '[]') as DocumentBlock[],
            plainText: row.document_plain_text ?? '',
          },
          row.block_id,
          row.excerpt,
        );
      return { ...task, source: { ...document, blockId: row.block_id, excerpt: row.excerpt, blockAvailable } };
    },
  };
}
