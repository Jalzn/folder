import { type Kysely, type RawBuilder, sql } from 'kysely';
import { compareSearchKeys, searchKey, searchTypeRankOf } from '../../application/reading/list-order.js';
import type { SearchHit, SearchQuery, WorkspaceReader } from '../../application/reading/ports.js';
import { excerptAround } from '../../domain/excerpt.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { matchesAllTerms, searchText } from '../../domain/search-text.js';
import type { WorkspaceTables } from '../db.js';
import { searchableItems, type TextType, titleLengthInSearchText } from './searchable.js';
import { projectColumns, projectReference } from './shared.js';

type SearchReads = Pick<WorkspaceReader, 'searchItems'>;
type WithoutExcerpt<Hit> = Hit extends unknown ? Omit<Hit, 'excerpt'> : never;
type RankedHit = WithoutExcerpt<SearchHit>;

/**
 * Rows of one item type that sort after the cursor key: a higher title rank, or the same rank and an
 * older edit, or the same edit time and a later type or ID.
 */
function afterKey(query: SearchQuery, typeRank: number, titleRank: RawBuilder<number>) {
  const key = query.after;
  if (!key) return sql<boolean>`1`;
  const sameTime = typeRank === key.typeRank ? sql`item.id > ${key.id}` : sql`${typeRank > key.typeRank ? 1 : 0}`;
  return sql<boolean>`(${titleRank} > ${key.titleRank} or (${titleRank} = ${key.titleRank} and (item.updated_at < ${key.updatedAt} or (item.updated_at = ${key.updatedAt} and ${sameTime}))))`;
}

export function searchReads(db: Kysely<WorkspaceTables>): SearchReads {
  async function textHits(type: TextType, query: SearchQuery, limit: number): Promise<RankedHit[]> {
    // search_text starts with the title, so a term first found within the title's length is in the title.
    const missingFromTitle = query.terms.map(
      (term) => sql<number>`(instr(item.search_text, ${term}) not between 1 and ${titleLengthInSearchText})`,
    );
    const titleRank = missingFromTitle.length ? sql<number>`${sql.join(missingFromTitle, sql` + `)}` : sql<number>`0`;
    let select = db
      .selectFrom(searchableItems(db, type))
      .leftJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .select(['item.id', 'item.title', 'item.updated_at', titleRank.as('title_rank')])
      .select(projectColumns)
      .where('item.deleted_at', 'is', null)
      .where(afterKey(query, searchTypeRankOf(type), titleRank))
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

  /** Task titles have no stored search column, so the normalized match runs here. A task matches by title. */
  async function taskHits(query: SearchQuery, limit: number): Promise<RankedHit[]> {
    let select = db
      .selectFrom('workspace_tasks as item')
      .leftJoin('workspace_projects as project', 'project.id', 'item.project_id')
      .select(['item.id', 'item.title', 'item.status', 'item.updated_at'])
      .select(projectColumns)
      .where('item.deleted_at', 'is', null)
      .where(afterKey(query, searchTypeRankOf('task'), sql<number>`0`))
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
    const rows = await db
      .selectFrom(searchableItems(db, type))
      .select(['item.id', 'item.plain_text'])
      .where('item.id', 'in', ids)
      .execute();
    return new Map(rows.map((row) => [row.id, row.plain_text]));
  }

  return {
    async searchItems(query) {
      // Each source returns enough rows for one page; merging them keeps the global order.
      const needed = query.limit + 1;
      const ranked = [
        ...(query.types.includes('document') ? await textHits('document', query, needed) : []),
        ...(query.types.includes('drawing') ? await textHits('drawing', query, needed) : []),
        ...(query.types.includes('task') ? await taskHits(query, needed) : []),
      ];
      ranked.sort((a, b) => compareSearchKeys(searchKey(a), searchKey(b)));
      const shown = ranked.slice(0, query.limit);
      const idsOf = (type: TextType) => shown.filter((hit) => hit.type === type).map((hit) => hit.id);
      const texts = new Map([
        ...(await plainTexts('document', idsOf('document'))),
        ...(await plainTexts('drawing', idsOf('drawing'))),
      ]);
      const { excerptChars, excerptLeadChars } = READING_LIMITS.search;
      const items = shown.map((hit): SearchHit => {
        if (hit.type === 'task') return hit;
        const text = texts.get(hit.id) ?? '';
        return { ...hit, excerpt: excerptAround(text, query.terms, excerptChars, excerptLeadChars) };
      });
      return { items, hasMore: ranked.length > query.limit };
    },
  };
}
