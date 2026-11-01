import { type Kysely, sql } from 'kysely';
import type { TextCut } from '../../domain/excerpt.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { WorkspaceTables } from '../db.js';
import { itemTable } from '../item-tables.js';
import { titleLengthInSearchText } from './searchable.js';

/** The item types whose text an excerpt comes from: a task's is its description. */
export type ExcerptType = 'document' | 'drawing' | 'task';

/** The stored text of `item` that excerpts come from. */
const plainTextOf = (type: ExcerptType) =>
  sql.ref<string>(type === 'task' ? 'item.description_plain_text' : 'item.plain_text');

export interface TextWindow {
  text: string;
  cut: TextCut;
}

/** The text after the title in `search_text`, where the excerpt looks for the terms. */
const normalizedText = sql<string>`substr(item.search_text, ${titleLengthInSearchText} + 2)`;

/**
 * Where the excerpt's part of the text starts, 1-based. The first match is found in the normalized
 * text; where normalization changed the length, as with decomposed accents, its place in the
 * stored text is estimated in proportion, and the margin absorbs the error. Only a text that
 * shrinks very unevenly, such as thousands of emoji before the match and none after, can move the
 * match out of the window; its excerpt then shows the window without it.
 */
function windowStart(terms: readonly string[], margin: number, plainText: ReturnType<typeof plainTextOf>) {
  if (!terms.length) return sql<number>`1`;
  const positions = sql.join(
    terms.map((term) => sql`select instr(${normalizedText}, ${term}) as position`),
    sql` union all `,
  );
  const firstMatch = sql`(select min(position) from (${positions}) where position > 0)`;
  const normalizedLength = sql`length(item.search_text) - ${titleLengthInSearchText} - 1`;
  const estimate = sql`${firstMatch} * length(${plainText}) / max(1, ${normalizedLength})`;
  return sql<number>`max(1, coalesce(${estimate}, 1) - ${margin})`;
}

/**
 * The part of each item's text that its excerpt can come from: a margin on both sides of the first
 * match, or the start without terms. Excerpts then normalize a few thousand characters per item,
 * however long the texts are.
 */
export async function excerptWindows(
  db: Kysely<WorkspaceTables>,
  type: ExcerptType,
  ids: readonly string[],
  terms: readonly string[],
): Promise<Map<string, TextWindow>> {
  if (!ids.length) return new Map();
  const { excerptChars, excerptWindowMargin } = READING_LIMITS.search;
  const length = 2 * excerptWindowMargin + excerptChars;
  const plainText = plainTextOf(type);
  const rows = await db
    // Materialized, so the match is searched once per item and the texts are not copied.
    .with(
      (cte) => cte('located').materialized(),
      (query) =>
        query
          .selectFrom(itemTable(db, type))
          .where('item.id', 'in', ids)
          .select(['item.id', windowStart(terms, excerptWindowMargin, plainText).as('start')]),
    )
    .selectFrom(itemTable(db, type))
    .innerJoin('located', 'located.id', 'item.id')
    .select([
      'located.id',
      'located.start',
      sql<number>`length(${plainText})`.as('text_length'),
      sql<string>`substr(${plainText}, located.start, ${length})`.as('text'),
    ])
    .execute();
  return new Map(
    rows.map((row) => [
      row.id,
      { text: row.text, cut: { before: row.start > 1, after: row.start - 1 + length < row.text_length } },
    ]),
  );
}
