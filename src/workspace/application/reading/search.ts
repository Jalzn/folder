import { readOffsetCursor } from '../../domain/paging.js';
import { searchText } from '../../domain/search-text.js';
import { READING_LIMITS } from './limits.js';
import type { ReadingContext } from './ports.js';
import type { SearchInput } from './schemas.js';

/** Finds or lists documents, drawings and tasks, most recently edited first. */
export async function search(ctx: ReadingContext, input: SearchInput) {
  const offset = readOffsetCursor(input.cursor, READING_LIMITS.searchOffset);
  const page = await ctx.read((reader) =>
    reader.searchItems({
      text: input.query === undefined ? undefined : searchText(input.query),
      projectId: input.projectId,
      types: input.types ?? ['document', 'drawing', 'task'],
      limit: input.limit,
      offset,
    }),
  );
  return { items: page.items, offset, nextOffset: page.hasMore ? offset + page.items.length : null };
}
