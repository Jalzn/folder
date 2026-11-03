import { matchesAllTerms, searchText } from '@tinyfold/core/domain';
import { afterKeyset, type Database, tables } from '@tinyfold/core/infra';
import type { DocumentBlock } from '@tinyfold/rich-text/domain';
import { sql } from 'kysely';
import type { BoardExternalPorts } from '../application/ports/external.js';
import type { BoardReader } from '../application/reading/ports.js';
import type { TaskLabel, TaskListing } from '../application/reading/read-models.js';
import { boardRepository } from './repository/board.js';
import { columnRepository } from './repository/columns.js';
import { labelRepository } from './repository/labels.js';
import type { BoardTables } from './sql/tables.js';
import { taskLabels } from './sql/task-labels.js';
import { hydrateTaskSource, taskChecklist } from './sql/task-source.js';

export function boardReader(connection: Database, external: BoardExternalPorts): BoardReader {
  const db = tables<BoardTables>(connection);
  const withSource = () =>
    db
      .selectFrom('workspace_tasks as item')
      .innerJoin('workspace_columns as col', 'col.id', 'item.column_id')
      .leftJoin('workspace_task_sources as source', 'source.task_id', 'item.id')
      .select([
        'item.id',
        'item.project_id',
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
        'source.document_id',
        'source.document_title as kept_title',
        'source.block_id',
        'source.excerpt',
      ])
      .where('item.deleted_at', 'is', null);
  type Row = Awaited<ReturnType<ReturnType<typeof withSource>['execute']>>[number];
  const facts = async (rows: readonly Row[], content = true) => {
    const projectIds = [...new Set(rows.map((row) => row.project_id))];
    const documentIds = [...new Set(rows.flatMap((row) => row.document_id ?? []))];
    const projects = projectIds.length ? await external.projectsByIds(projectIds) : [];
    const documents = documentIds.length ? await external.documentsByIds(documentIds, { content }) : [];
    const labels = await taskLabels(
      db,
      rows.map((row) => row.id),
    );
    return {
      projects: new Map(projects.map((project) => [project.id, project])),
      documents: new Map(documents.map((document) => [document.id, document])),
      labels,
    };
  };
  const listed = (
    row: Row,
    project: { id: string; name: string; archivedAt: unknown },
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
    projectId: project.id,
    projectName: project.name,
    projectArchived: project.archivedAt !== null,
    updatedAt: row.updated_at,
  });
  return {
    boardRevision: boardRepository(connection).revision,
    columns: columnRepository(connection).activeColumns,
    labels: labelRepository(connection).activeLabels,
    async tasks(query) {
      let select = withSource().orderBy('col.position').orderBy('item.position').orderBy('item.id');
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
      if (query.after)
        select = select.where(
          afterKeyset([
            { expression: sql.ref('col.position'), value: query.after.columnRank, direction: 'asc' },
            { expression: sql.ref('item.position'), value: query.after.position, direction: 'asc' },
            { expression: sql.ref('item.id'), value: query.after.id, direction: 'asc' },
          ]),
        );
      if (!query.terms.length) select = select.limit(query.limit + 1);
      const rows = await select.execute();
      const matching = query.terms.length
        ? rows.filter((row) => matchesAllTerms(searchText(row.title), query.terms)).slice(0, query.limit + 1)
        : rows;
      const shown = matching.slice(0, query.limit);
      const found = await facts(shown, false);
      const items: TaskListing[] = [];
      for (const row of shown) {
        const project = found.projects.get(row.project_id);
        if (!project) throw new Error('Task project is missing from its transaction snapshot.');
        const document = row.document_id === null ? undefined : found.documents.get(row.document_id);
        const source =
          row.excerpt !== null && row.kept_title !== null
            ? row.document_id === null
              ? { documentId: null, documentTitle: row.kept_title, available: false }
              : document && document.deletedAt === null
                ? { documentId: document.id, documentTitle: document.title, available: true }
                : { documentId: row.document_id, documentTitle: null, available: false }
            : null;
        items.push({ ...listed(row, project, found.labels.get(row.id) ?? []), source });
      }
      return { items, hasMore: matching.length > query.limit };
    },
    async task(id) {
      const row = await withSource()
        .select(['item.description', 'item.version', 'item.text_version'])
        .where('item.id', '=', id)
        .executeTakeFirst();
      if (!row) return undefined;
      const found = await facts([row]);
      const project = found.projects.get(row.project_id);
      if (!project) throw new Error('Task project is missing from its transaction snapshot.');
      const source =
        row.excerpt !== null && row.kept_title !== null
          ? hydrateTaskSource(
              {
                documentId: row.document_id,
                keptTitle: row.kept_title,
                blockId: row.block_id,
                excerpt: row.excerpt,
                document: row.document_id === null ? undefined : found.documents.get(row.document_id),
              },
              'agent',
            )
          : null;
      return {
        ...listed(row, project, found.labels.get(row.id) ?? []),
        createdAt: row.created_at,
        version: row.version,
        textVersion: row.text_version,
        description: JSON.parse(row.description) as DocumentBlock[],
        source,
      };
    },
  };
}
