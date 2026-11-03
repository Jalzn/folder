import { type Kysely, type RawBuilder, sql } from 'kysely';
import type { SearchHit, SearchQuery } from '../../application/reading/read-models.js';
import { searchTypeRankOf } from '../../domain/list-order.js';
import { folderColumns, folderReference } from '../sql/folders.js';
import { itemTable } from '../sql/item-tables.js';
import { projectColumns, projectReference } from '../sql/references.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { type TextType, titleLengthInSearchText } from './searchable.js';

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
export async function textHits(
  db: Kysely<WorkspaceTables>,
  type: TextType,
  query: SearchQuery,
  limit: number,
): Promise<RankedHit[]> {
  // search_text starts with the title, so a term first found within the title's length is in the title.
  const missingFromTitle = query.terms.map(
    (term) => sql<number>`(instr(item.search_text, ${term}) not between 1 and ${titleLengthInSearchText})`,
  );
  const titleRank = missingFromTitle.length ? sql<number>`${sql.join(missingFromTitle, sql` + `)}` : sql<number>`0`;
  let select = db
    .selectFrom(itemTable(db, type))
    .innerJoin('workspace_projects as project', 'project.id', 'item.project_id')
    .leftJoin('workspace_folders as folder', 'folder.id', 'item.folder_id')
    .select(['item.id', 'item.title', 'item.updated_at', 'item.pinned_at', titleRank.as('title_rank')])
    .select(projectColumns)
    .select(folderColumns)
    .where('item.deleted_at', 'is', null)
    .where(afterKey(query, searchTypeRankOf(type), titleRank))
    .orderBy('title_rank')
    .orderBy('item.updated_at', 'desc')
    .orderBy('item.id')
    .limit(limit);
  if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
  if (query.folderId) select = select.where('item.folder_id', '=', query.folderId);
  for (const term of query.terms) select = select.where(sql<boolean>`instr(item.search_text, ${term}) > 0`);
  return (await select.execute()).map((row) => ({
    type,
    id: row.id,
    title: row.title,
    ...projectReference(row),
    updatedAt: row.updated_at,
    pinned: row.pinned_at !== null,
    folder: folderReference(row),
    titleRank: row.title_rank,
  }));
}
export async function taskHits(db: Kysely<WorkspaceTables>, query: SearchQuery, limit: number): Promise<RankedHit[]> {
  const missingFromTitle = query.terms.map(
    (term) => sql<number>`(instr(item.search_text, ${term}) not between 1 and ${titleLengthInSearchText})`,
  );
  const titleRank = missingFromTitle.length ? sql<number>`${sql.join(missingFromTitle, sql` + `)}` : sql<number>`0`;
  let select = db
    .selectFrom('workspace_tasks as item')
    .innerJoin('workspace_projects as project', 'project.id', 'item.project_id')
    .innerJoin('workspace_columns as col', 'col.id', 'item.column_id')
    .select(['item.id', 'item.title', 'item.updated_at', titleRank.as('title_rank')])
    .select(['col.id as column_id', 'col.name as column_name', 'col.is_done as column_is_done'])
    .select(projectColumns)
    .where('item.deleted_at', 'is', null)
    .where(afterKey(query, searchTypeRankOf('task'), titleRank))
    .orderBy('title_rank')
    .orderBy('item.updated_at', 'desc')
    .orderBy('item.id')
    .limit(limit);
  if (query.projectId) select = select.where('item.project_id', '=', query.projectId);
  for (const term of query.terms) select = select.where(sql<boolean>`instr(item.search_text, ${term}) > 0`);
  return (await select.execute()).map((row) => ({
    type: 'task' as const,
    id: row.id,
    title: row.title,
    column: { id: row.column_id, name: row.column_name, isDone: row.column_is_done === 1 },
    ...projectReference(row),
    updatedAt: row.updated_at,
    titleRank: row.title_rank,
  }));
}
