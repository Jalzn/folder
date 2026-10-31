import { type Kysely, sql } from 'kysely';
import type { WorkspaceTables } from '../db.js';

/** The item types stored with a normalized search column. */
export type TextType = 'document' | 'drawing';

const tables = { document: 'workspace_documents', drawing: 'workspace_canvases' } as const;

/**
 * The documents or drawings table as `item`. Queries on it can only name the columns both tables
 * share, so renaming one in either table fails to typecheck.
 */
export const searchableItems = (db: Kysely<WorkspaceTables>, type: TextType) =>
  db.dynamic.table(tables[type]).as('item');

/**
 * The length of the normalized title that starts `search_text`, before the line break and the
 * text. A title with a line break of its own falls back to its raw length.
 */
export const titleLengthInSearchText = sql<number>`(case when instr(item.title, char(10)) > 0
  then length(item.title) else instr(item.search_text, char(10)) - 1 end)`;
