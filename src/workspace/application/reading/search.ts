import { readSearchCursor, SEARCH_ITEM_TYPES, searchCursor } from '../../domain/paging.js';
import { keysetPage } from './keyset-page.js';
import { searchKey } from './list-order.js';
import type { ReadingContext } from './ports.js';
import { queryTerms } from './query-terms.js';
import type { SearchInput } from './schemas.js';

/**
 * Finds documents, drawings and tasks that contain every word of the query, those with more of the
 * words in the title first, then the most recently edited; without a query, lists the most recent items.
 */
export async function search(ctx: ReadingContext, input: SearchInput) {
  const after = input.cursor === undefined ? undefined : readSearchCursor(input.cursor);
  const terms = queryTerms(input.query);
  const page = await ctx.read((reader) =>
    reader.searchItems({
      terms,
      projectId: input.projectId,
      types: input.types ?? SEARCH_ITEM_TYPES,
      limit: input.limit,
      after,
    }),
  );
  return keysetPage(page, (hit) => searchCursor(searchKey(hit)));
}
