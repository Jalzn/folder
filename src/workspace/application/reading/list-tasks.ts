import { readOffsetCursor } from '../../domain/paging.js';
import { searchText } from '../../domain/search-text.js';
import { READING_LIMITS } from './limits.js';
import type { ReadingContext } from './ports.js';
import type { ListTasksInput } from './schemas.js';

/** Tasks in board order: column, then position. */
export async function listTasks(ctx: ReadingContext, input: ListTasksInput) {
  const offset = readOffsetCursor(input.cursor, READING_LIMITS.taskOffset);
  const page = await ctx.read((reader) =>
    reader.tasks({
      projectId: input.projectId,
      statuses: input.status,
      text: input.query === undefined ? undefined : searchText(input.query),
      limit: input.limit,
      offset,
    }),
  );
  return { tasks: page.items, offset, nextOffset: page.hasMore ? offset + page.items.length : null };
}
