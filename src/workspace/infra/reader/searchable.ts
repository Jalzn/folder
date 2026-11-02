import { sql } from 'kysely';

/** The item types stored with a normalized search column. */
export type TextType = 'document' | 'drawing';

/**
 * The length of the normalized title that starts `search_text`, before the line break and the
 * text. A title with a line break of its own falls back to its raw length.
 */
export const titleLengthInSearchText = sql<number>`(case when instr(item.title, char(10)) > 0
  then length(item.title) else instr(item.search_text, char(10)) - 1 end)`;
