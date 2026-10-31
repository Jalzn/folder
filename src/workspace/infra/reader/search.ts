import { type Kysely, sql } from 'kysely';
import type { SearchHit, SearchItemType, SearchQuery, WorkspaceReader } from '../../application/reading/ports.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { searchText } from '../../domain/search-text.js';
import type { WorkspaceTables } from '../db.js';
import { projectColumns, projectReference } from './shared.js';

type SearchReads = Pick<WorkspaceReader, 'searchItems'>;

const typeOrder: Record<SearchItemType, number> = { document: 0, drawing: 1, task: 2 };
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function searchReads(db: Kysely<WorkspaceTables>): SearchReads {
  async function textHits(type: 'document' | 'drawing', query: SearchQuery, limit: number): Promise<SearchHit[]> {
    // Documents and drawings share every column read here.
    const table = (type === 'document' ? 'workspace_documents' : 'workspace_canvases') as 'workspace_documents';
    const { excerptChars, excerptLeadChars } = READING_LIMITS.search;
    // The match position in search_text, minus the title and its line break, approximates the position in the text.
    const start =
      query.text === undefined
        ? sql<number>`1`
        : sql<number>`max(1, instr(item.search_text, ${query.text}) - length(item.title) - 1 - ${excerptLeadChars})`;
    let select = db
      .selectFrom(`${table} as item`)
      .leftJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .select(['item.id', 'item.title', 'item.updated_at'])
      .select(projectColumns)
      .select([
        sql<string>`substr(item.plain_text, ${start}, ${excerptChars})`.as('excerpt'),
        sql<number>`${start} > 1`.as('cut_before'),
        sql<number>`length(item.plain_text) >= ${start} + ${excerptChars}`.as('cut_after'),
      ])
      .where('item.deleted_at', 'is', null)
      .orderBy('item.updated_at', 'desc')
      .orderBy('item.id')
      .limit(limit);
    if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
    if (query.text !== undefined) select = select.where(sql<boolean>`instr(item.search_text, ${query.text}) > 0`);
    return (await select.execute()).map((row) => ({
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
    let select = db
      .selectFrom('workspace_tasks as item')
      .leftJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .select(['item.id', 'item.title', 'item.status', 'item.updated_at'])
      .select(projectColumns)
      .where('item.deleted_at', 'is', null)
      .orderBy('item.updated_at', 'desc')
      .orderBy('item.id');
    if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
    if (query.text === undefined) select = select.limit(limit);
    const text = query.text;
    return (await select.execute())
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
  };
}

/** Marks cut ends with an ellipsis, keeping the excerpt within its length, on one line. */
function excerpt(text: string, cutBefore: boolean, cutAfter: boolean): string {
  let value = text;
  if (cutBefore) value = `…${value.slice(1)}`;
  if (cutAfter) value = `${value.slice(0, -1)}…`;
  return value.replace(/\s+/gu, ' ').trim();
}
