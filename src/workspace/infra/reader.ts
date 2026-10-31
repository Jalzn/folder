import { type Database, tables } from '@tinyfold/core/infra';
import { type RawBuilder, sql } from 'kysely';
import { READING_LIMITS } from '../application/reading/limits.js';
import type {
  ItemCounts,
  ProjectReference,
  SearchHit,
  SearchItemType,
  SearchQuery,
  TaskListing,
  WorkspaceReader,
} from '../application/reading/ports.js';
import type { CanvasScene } from '../domain/canvas.js';
import type { DocumentBlock, TaskStatus } from '../domain/models.js';
import { searchText } from '../domain/search-text.js';
import type { TaskRow, WorkspaceTables } from './db.js';
import { hydrateTasks } from './repository/tasks.js';

interface ProjectReferenceRow {
  project_id: string | null;
  project_name: string | null;
  project_archived_at: string | null;
}
const projectReference = (row: ProjectReferenceRow): ProjectReference => ({
  projectId: row.project_id,
  projectName: row.project_name,
  projectArchived: row.project_archived_at !== null,
});
const projectColumns = sql`item.project_id, project.name as project_name, project.archived_at as project_archived_at`;
const projectJoin = sql`left join workspace_projects as project on project.id = item.project_id`;
const byProject = (projectId: string | undefined) => (projectId ? sql`and item.project_id = ${projectId}` : sql``);
/** Board order: the todo, doing and done columns, then the position within each. */
const boardOrder = sql`case item.status when 'todo' then 0 when 'doing' then 1 else 2 end, item.position, item.id`;
const textTables = { document: 'workspace_documents', drawing: 'workspace_canvases' } as const;
const typeOrder: Record<SearchItemType, number> = { document: 0, drawing: 1, task: 2 };
/** Characters of context kept before the first match in an excerpt. */
const excerptLead = 60;

interface CountsRow {
  documents: number;
  drawings: number;
  open_tasks: number;
}
const itemCounts = (row: CountsRow): ItemCounts => ({
  documents: row.documents,
  drawings: row.drawings,
  openTasks: row.open_tasks,
});
const countsWhere = (projectMatch: RawBuilder<unknown>) => sql`
  (select count(*) from workspace_documents as d where ${projectMatch} and d.deleted_at is null) as documents,
  (select count(*) from workspace_canvases as d where ${projectMatch} and d.deleted_at is null) as drawings,
  (select count(*) from workspace_tasks as d where ${projectMatch} and d.deleted_at is null and d.status <> 'done') as open_tasks`;

export function workspaceReader(db: Database): WorkspaceReader {
  async function textHits(type: 'document' | 'drawing', query: SearchQuery, limit: number): Promise<SearchHit[]> {
    // The match position in search_text, minus the title and its line break, approximates the position in the text.
    const start =
      query.text === undefined
        ? sql`1`
        : sql`max(1, instr(item.search_text, ${query.text}) - length(item.title) - 1 - ${excerptLead})`;
    const { rows } = await sql<
      ProjectReferenceRow & {
        id: string;
        title: string;
        updated_at: string;
        excerpt: string;
        cut_before: number;
        cut_after: number;
      }
    >`
      select item.id, item.title, item.updated_at, ${projectColumns},
        substr(item.plain_text, ${start}, ${READING_LIMITS.excerptLength}) as excerpt,
        ${start} > 1 as cut_before,
        length(item.plain_text) >= ${start} + ${READING_LIMITS.excerptLength} as cut_after
      from ${sql.table(textTables[type])} as item ${projectJoin}
      where item.deleted_at is null ${byProject(query.projectId)}
        ${query.text === undefined ? sql`` : sql`and instr(item.search_text, ${query.text}) > 0`}
      order by item.updated_at desc, item.id
      limit ${limit}`.execute(db);
    return rows.map((row) => ({
      type,
      id: row.id,
      title: row.title,
      ...projectReference(row),
      updatedAt: row.updated_at,
      excerpt: excerpt(row.excerpt, Boolean(row.cut_before), Boolean(row.cut_after)),
    }));
  }

  /** Task titles have no stored search column, so the normalized match runs here. */
  async function taskHits(query: SearchQuery, limit: number): Promise<SearchHit[]> {
    const { rows } = await sql<
      ProjectReferenceRow & { id: string; title: string; status: TaskStatus; updated_at: string }
    >`
      select item.id, item.title, item.status, item.updated_at, ${projectColumns}
      from workspace_tasks as item ${projectJoin}
      where item.deleted_at is null ${byProject(query.projectId)}
      order by item.updated_at desc, item.id
      ${query.text === undefined ? sql`limit ${limit}` : sql``}`.execute(db);
    const text = query.text;
    return rows
      .filter((row) => text === undefined || searchText(row.title).includes(text))
      .slice(0, limit)
      .map((row) => ({
        type: 'task' as const,
        id: row.id,
        title: row.title,
        status: row.status,
        ...projectReference(row),
        updatedAt: row.updated_at,
      }));
  }

  return {
    async projectsWithCounts(includeArchived, limit) {
      const { rows } = await sql<
        CountsRow & { id: string; name: string; archived_at: string | null; created_at: string; updated_at: string }
      >`
        select item.id, item.name, item.archived_at, item.created_at, item.updated_at,
          ${countsWhere(sql`d.project_id = item.id`)}
        from workspace_projects as item
        ${includeArchived ? sql`` : sql`where item.archived_at is null`}
        order by item.updated_at desc, item.id
        limit ${limit}`.execute(db);
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        archived: row.archived_at !== null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...itemCounts(row),
      }));
    },

    async withoutProjectCounts() {
      const { rows } = await sql<CountsRow>`select ${countsWhere(sql`d.project_id is null`)}`.execute(db);
      return itemCounts(rows[0] ?? { documents: 0, drawings: 0, open_tasks: 0 });
    },

    async searchItems(query) {
      // Each source returns enough rows for the requested page; merging them keeps the global order.
      const needed = query.offset + query.limit + 1;
      const hits = [
        ...(query.types.includes('document') ? await textHits('document', query, needed) : []),
        ...(query.types.includes('drawing') ? await textHits('drawing', query, needed) : []),
        ...(query.types.includes('task') ? await taskHits(query, needed) : []),
      ].sort(
        (a, b) => compare(b.updatedAt, a.updatedAt) || typeOrder[a.type] - typeOrder[b.type] || compare(a.id, b.id),
      );
      return {
        items: hits.slice(query.offset, query.offset + query.limit),
        hasMore: hits.length > query.offset + query.limit,
      };
    },

    async documentForReading(id) {
      const { rows } = await sql<
        ProjectReferenceRow & {
          id: string;
          title: string;
          content: string;
          version: number;
          created_at: string;
          updated_at: string;
        }
      >`
        select item.id, item.title, item.content, item.version, item.created_at, item.updated_at, ${projectColumns}
        from workspace_documents as item ${projectJoin}
        where item.id = ${id} and item.deleted_at is null`.execute(db);
      const row = rows[0];
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

    async tasksFromDocument(documentId, limit) {
      const { rows } = await sql<{ id: string; title: string; status: TaskStatus }>`
        select item.id, item.title, item.status
        from workspace_task_sources as source join workspace_tasks as item on item.id = source.task_id
        where source.document_id = ${documentId} and item.deleted_at is null
        order by ${boardOrder}
        limit ${limit}`.execute(db);
      return rows;
    },

    async canvasForReading(id) {
      const { rows } = await sql<
        ProjectReferenceRow & { id: string; title: string; scene: string; version: number; updated_at: string }
      >`
        select item.id, item.title, item.scene, item.version, item.updated_at, ${projectColumns}
        from workspace_canvases as item ${projectJoin}
        where item.id = ${id} and item.deleted_at is null`.execute(db);
      const row = rows[0];
      return (
        row && {
          id: row.id,
          title: row.title,
          ...projectReference(row),
          scene: JSON.parse(row.scene) as CanvasScene,
          version: row.version,
          updatedAt: row.updated_at,
        }
      );
    },

    async tasks(query) {
      const statuses = query.statuses?.length ? sql`and item.status in (${sql.join([...query.statuses])})` : sql``;
      const paging = query.text === undefined ? sql`limit ${query.limit + 1} offset ${query.offset}` : sql``;
      const { rows } = await sql<
        ProjectReferenceRow & {
          id: string;
          title: string;
          status: TaskStatus;
          updated_at: string;
          document_id: string | null;
          document_title: string | null;
        }
      >`
        select item.id, item.title, item.status, item.updated_at, ${projectColumns},
          source.document_id, case when document.deleted_at is null then document.title end as document_title
        from workspace_tasks as item ${projectJoin}
        left join workspace_task_sources as source on source.task_id = item.id
        left join workspace_documents as document on document.id = source.document_id
        where item.deleted_at is null ${byProject(query.projectId)} ${statuses}
        order by ${boardOrder}
        ${paging}`.execute(db);
      const text = query.text;
      const matching =
        text === undefined
          ? rows
          : rows
              .filter((row) => searchText(row.title).includes(text))
              .slice(query.offset, query.offset + query.limit + 1);
      const items = matching.slice(0, query.limit).map(
        (row): TaskListing => ({
          id: row.id,
          title: row.title,
          status: row.status,
          ...projectReference(row),
          updatedAt: row.updated_at,
          source: row.document_id
            ? { documentId: row.document_id, documentTitle: row.document_title, available: row.document_title !== null }
            : null,
        }),
      );
      return { items, hasMore: matching.length > query.limit };
    },

    async task(id) {
      const { rows } = await sql<TaskRow & ProjectReferenceRow>`
        select item.*, project.name as project_name, project.archived_at as project_archived_at
        from workspace_tasks as item ${projectJoin}
        where item.id = ${id} and item.deleted_at is null`.execute(db);
      const row = rows[0];
      if (!row) return undefined;
      const [task] = await hydrateTasks(tables<WorkspaceTables>(db), [row]);
      if (!task) return undefined;
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        ...projectReference(row),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        position: task.position,
        source: task.source && {
          ...task.source,
          documentTitle: task.source.available ? task.source.documentTitle : null,
        },
      };
    },
  };
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Marks cut ends with an ellipsis, keeping the excerpt within its length, on one line. */
function excerpt(text: string, cutBefore: boolean, cutAfter: boolean): string {
  let value = text;
  if (cutBefore) value = `…${value.slice(1)}`;
  if (cutAfter) value = `${value.slice(0, -1)}…`;
  return value.replace(/\s+/gu, ' ').trim();
}
