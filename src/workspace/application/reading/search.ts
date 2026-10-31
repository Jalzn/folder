import { readOffsetCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { ReadingContext } from './ports.js';
import { queryTerms } from './query-terms.js';
import type { SearchInput } from './schemas.js';

/**
 * Finds documents, drawings and tasks that contain every word of the query, those with more of the
 * words in the title first, then the most recently edited; without a query, lists the most recent items.
 */
export async function search(ctx: ReadingContext, input: SearchInput) {
  const offset = readOffsetCursor(input.cursor, READING_LIMITS.search.maxOffset);
  const terms = queryTerms(input.query);
  const page = await ctx.read((reader) =>
    reader.searchItems({
      terms,
      projectId: input.projectId,
      types: input.types ?? ['document', 'drawing', 'task'],
      limit: input.limit,
      offset,
    }),
  );
  return { items: page.items, offset, nextOffset: page.hasMore ? offset + page.items.length : null };
}
