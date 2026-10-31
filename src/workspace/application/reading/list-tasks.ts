import { readOffsetCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { ReadingContext } from './ports.js';
import { queryTerms } from './query-terms.js';
import type { ListTasksInput } from './schemas.js';

/** Tasks in board order: column, then position. */
export async function listTasks(ctx: ReadingContext, input: ListTasksInput) {
  const offset = readOffsetCursor(input.cursor, READING_LIMITS.tasks.maxOffset);
  const terms = queryTerms(input.query);
  const page = await ctx.read((reader) =>
    reader.tasks({
      projectId: input.projectId,
      statuses: input.status,
      terms,
      limit: input.limit,
      offset,
    }),
  );
  return { tasks: page.items, offset, nextOffset: page.hasMore ? offset + page.items.length : null };
}
