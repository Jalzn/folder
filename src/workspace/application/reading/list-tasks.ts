import { boardCursor, readBoardCursor } from '../../domain/paging.js';
import { boardKey } from './list-order.js';
import type { ReadingContext } from './ports.js';
import { queryTerms } from './query-terms.js';
import type { ListTasksInput } from './schemas.js';

/** Tasks in board order: column, then position. */
export async function listTasks(ctx: ReadingContext, input: ListTasksInput) {
  const after = input.cursor === undefined ? undefined : readBoardCursor(input.cursor);
  const terms = queryTerms(input.query);
  const page = await ctx.read((reader) =>
    reader.tasks({
      projectId: input.projectId,
      documentId: input.documentId,
      statuses: input.status,
      terms,
      limit: input.limit,
      after,
    }),
  );
  return {
    tasks: page.items,
    /** The cursor after the first `shown` tasks, which may be fewer than the page; null at the end. */
    nextCursor(shown: number) {
      const last = page.items[shown - 1];
      return last && (shown < page.items.length || page.hasMore) ? boardCursor(boardKey(last)) : null;
    },
  };
}
