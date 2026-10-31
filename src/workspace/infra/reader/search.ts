import { type Kysely, sql } from 'kysely';
import type { SearchHit, SearchItemType, SearchQuery, WorkspaceReader } from '../../application/reading/ports.js';
import { excerptAround } from '../../domain/excerpt.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { matchesAllTerms, searchText } from '../../domain/search-text.js';
import type { WorkspaceTables } from '../db.js';
import { projectColumns, projectReference } from './shared.js';

type SearchReads = Pick<WorkspaceReader, 'searchItems'>;
type TextType = 'document' | 'drawing';
type WithoutExcerpt<Hit> = Hit extends unknown ? Omit<Hit, 'excerpt'> : never;
/** A hit before its excerpt is cut, ranked by how many query words its title lacks. */
type RankedHit = WithoutExcerpt<SearchHit> & { titleRank: number };

const tables = { document: 'workspace_documents', drawing: 'workspace_canvases' } as const;
const typeOrder: Record<SearchItemType, number> = { document: 0, drawing: 1, task: 2 };
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
/** More query words in the title first, then the most recently edited; type and ID keep ties stable. */
const searchOrder = (a: RankedHit, b: RankedHit) =>
  a.titleRank - b.titleRank ||
  compare(b.updatedAt, a.updatedAt) ||
  typeOrder[a.type] - typeOrder[b.type] ||
  compare(a.id, b.id);

export function searchReads(db: Kysely<WorkspaceTables>): SearchReads {
  async function textHits(type: TextType, query: SearchQuery, limit: number): Promise<RankedHit[]> {
    // Documents and drawings share every column read here.
    const table = tables[type] as 'workspace_documents';
    // search_text starts with the title, so a term first found within the title's length is in the title.
    const missingFromTitle = query.terms.map(
      (term) => sql<number>`(instr(item.search_text, ${term}) not between 1 and length(item.title))`,
    );
    const titleRank = missingFromTitle.length ? sql<number>`${sql.join(missingFromTitle, sql` + `)}` : sql<number>`0`;
    let select = db
      .selectFrom(`${table} as item`)
      .leftJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .select(['item.id', 'item.title', 'item.updated_at', titleRank.as('title_rank')])
      .select(projectColumns)
      .where('item.deleted_at', 'is', null)
      .orderBy('title_rank')
      .orderBy('item.updated_at', 'desc')
      .orderBy('item.id')
      .limit(limit);
    if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
    for (const term of query.terms) select = select.where(sql<boolean>`instr(item.search_text, ${term}) > 0`);
    return (await select.execute()).map((row) => ({
      type,
      id: row.id,
      title: row.title,
      ...projectReference(row),
      updatedAt: row.updated_at,
      titleRank: row.title_rank,
    }));
  }

  /** Task titles have no stored search column, so the normalized match runs here. */
  async function taskHits(query: SearchQuery, limit: number): Promise<RankedHit[]> {
    let select = db
      .selectFrom('workspace_tasks as item')
      .leftJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .select(['item.id', 'item.title', 'item.status', 'item.updated_at'])
      .select(projectColumns)
      .where('item.deleted_at', 'is', null)
      .orderBy('item.updated_at', 'desc')
      .orderBy('item.id');
    if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
    if (!query.terms.length) select = select.limit(limit);
    return (await select.execute())
      .filter((row) => matchesAllTerms(searchText(row.title), query.terms))
      .slice(0, limit)
      .map((row) => ({
        type: 'task' as const,
        id: row.id,
        title: row.title,
        status: row.status,
        ...projectReference(row),
        updatedAt: row.updated_at,
        titleRank: 0,
      }));
  }

  /** The full text of the shown documents and drawings, read only for their excerpts. */
  async function plainTexts(type: TextType, ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const table = tables[type] as 'workspace_documents';
    const rows = await db.selectFrom(table).select(['id', 'plain_text']).where('id', 'in', ids).execute();
    return new Map(rows.map((row) => [row.id, row.plain_text]));
  }

  return {
    async searchItems(query) {
      // Each source returns enough rows for the requested page; merging them keeps the global order.
      const needed = query.offset + query.limit + 1;
      const ranked = [
        ...(query.types.includes('document') ? await textHits('document', query, needed) : []),
        ...(query.types.includes('drawing') ? await textHits('drawing', query, needed) : []),
        ...(query.types.includes('task') ? await taskHits(query, needed) : []),
      ].sort(searchOrder);
      const shown = ranked.slice(query.offset, query.offset + query.limit);
      const idsOf = (type: TextType) => shown.filter((hit) => hit.type === type).map((hit) => hit.id);
      const texts = new Map([
        ...(await plainTexts('document', idsOf('document'))),
        ...(await plainTexts('drawing', idsOf('drawing'))),
      ]);
      const { excerptChars, excerptLeadChars } = READING_LIMITS.search;
      const items = shown.map(({ titleRank: _rank, ...hit }): SearchHit => {
        if (hit.type === 'task') return hit;
        const text = texts.get(hit.id) ?? '';
        return { ...hit, excerpt: excerptAround(text, query.terms, excerptChars, excerptLeadChars) };
      });
      return { items, hasMore: ranked.length > query.offset + query.limit };
    },
  };
}
