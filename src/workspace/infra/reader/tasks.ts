import { type Kysely, sql } from 'kysely';
import type { WorkspaceReader } from '../../application/reading/ports.js';
import type { TaskLabel, TaskListing } from '../../application/reading/read-models.js';
import type { DocumentBlock } from '../../domain/document-models.js';
import { byLabelName } from '../../domain/labels.js';
import { matchesAllTerms, searchText } from '../../domain/search-text.js';
import { activeColumnRows } from '../sql/board.js';
import { columnModel, labelModel } from '../sql/mappers.js';
import { columnRank, projectColumns, projectReference, sourceColumns, sourceDocument } from '../sql/references.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { hydrateTaskSource, taskChecklist } from '../sql/task-source.js';

type TaskReads = Pick<WorkspaceReader, 'tasks' | 'task' | 'boardRevision' | 'columns' | 'labels'>;

/** The left join finds a source row when the task has one: every source keeps an excerpt and a title. */
const hasSource = <Row extends { excerpt: string | null; kept_title: string | null }>(
  row: Row,
): row is Row & { excerpt: string; kept_title: string } => row.excerpt !== null && row.kept_title !== null;

export function taskReads(db: Kysely<WorkspaceTables>): TaskReads {
  const withSource = () =>
    db
      .selectFrom('workspace_tasks as item')
      .innerJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .innerJoin('workspace_columns as col', 'col.id', 'item.column_id')
      .leftJoin('workspace_task_sources as source', 'source.task_id', 'item.id')
      .leftJoin('workspace_documents as document', 'document.id', 'source.document_id')
      .select([
        'item.id',
        'item.title',
        'item.position',
        'item.due_on',
        'item.completed_at',
        'item.checklist_done',
        'item.checklist_total',
        'item.created_at',
        'item.updated_at',
        'col.id as column_id',
        'col.name as column_name',
        'col.is_done as column_is_done',
        'col.position as column_position',
      ])
      .select(projectColumns)
      .select(sourceColumns)
      .where('item.deleted_at', 'is', null);

  /** What a listing and a detail share, from a row of `withSource`. */
  const listed = (
    row: Awaited<ReturnType<ReturnType<typeof withSource>['execute']>>[number],
    labels: TaskLabel[],
  ): Omit<TaskListing, 'source'> => ({
    id: row.id,
    title: row.title,
    column: { id: row.column_id, name: row.column_name, isDone: row.column_is_done === 1 },
    columnPosition: row.column_position,
    position: row.position,
    dueOn: row.due_on,
    completedAt: row.completed_at,
    labels,
    checklist: taskChecklist(row),
    ...projectReference(row),
    updatedAt: row.updated_at,
  });

  return {
    async boardRevision() {
      const state = await db
        .selectFrom('workspace_state')
        .select('board_revision')
        .where('id', '=', 1)
        .executeTakeFirstOrThrow();
      return state.board_revision;
    },

    async columns() {
      return (await activeColumnRows(db)).map(columnModel);
    },

    async labels() {
      const rows = await db.selectFrom('workspace_labels').selectAll().where('deleted_at', 'is', null).execute();
      return rows.map(labelModel).sort(byLabelName);
    },

    async tasks(query) {
      let select = withSource().orderBy(columnRank).orderBy('item.position').orderBy('item.id');
      if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
      if (query.documentId) select = select.where('source.document_id', '=', query.documentId);
      if (query.columnIds) select = select.where('item.column_id', 'in', [...query.columnIds]);
      for (const labelId of query.labelIds ?? [])
        select = select.where((eb) =>
          eb.exists(
            eb
              .selectFrom('workspace_task_labels as link')
              .select('link.task_id')
              .whereRef('link.task_id', '=', 'item.id')
              .where('link.label_id', '=', labelId),
          ),
        );
      const after = query.after;
      if (after)
        select = select.where(
          sql<boolean>`(${columnRank}, item.position, item.id) > (${after.columnRank}, ${after.position}, ${after.id})`,
        );
      // Titles match in their normalized form, after the query: list_tasks filters by title only.
      if (!query.terms.length) select = select.limit(query.limit + 1);
      const rows = await select.execute();
      const matching = query.terms.length
        ? rows.filter((row) => matchesAllTerms(searchText(row.title), query.terms)).slice(0, query.limit + 1)
        : rows;
      const shown = matching.slice(0, query.limit);
      const labels = await taskLabels(
        db,
        shown.map((row) => row.id),
      );
      const items = shown.map(
        (row): TaskListing => ({
          ...listed(row, labels.get(row.id) ?? []),
          source: hasSource(row) ? sourceDocument(row) : null,
        }),
      );
      return { items, hasMore: matching.length > query.limit };
    },

    async task(id) {
      const row = await withSource()
        .select([
          'item.description',
          'item.version',
          'item.text_version',
          'document.content as document_content',
          'document.plain_text as document_plain_text',
        ])
        .where('item.id', '=', id)
        .executeTakeFirst();
      if (!row) return undefined;
      const task = {
        ...listed(row, (await taskLabels(db, [row.id])).get(row.id) ?? []),
        createdAt: row.created_at,
        version: row.version,
        textVersion: row.text_version,
        description: JSON.parse(row.description) as DocumentBlock[],
      };
      if (!hasSource(row)) return { ...task, source: null };
      const source = hydrateTaskSource(
        {
          documentId: row.document_id,
          keptTitle: row.kept_title,
          blockId: row.block_id,
          excerpt: row.excerpt,
          document:
            row.document_title === null
              ? undefined
              : {
                  title: row.document_title,
                  deletedAt: row.document_deleted_at,
                  content: JSON.parse(row.document_content ?? '[]') as DocumentBlock[],
                  plainText: row.document_plain_text ?? '',
                },
        },
        'agent',
      );
      return { ...task, source };
    },
  };
}

import { taskLabels } from '../sql/task-labels.js';
