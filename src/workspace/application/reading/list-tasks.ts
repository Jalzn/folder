import { boardCursor, readBoardCursor } from '../../domain/paging.js';
import { keysetPage } from './keyset-page.js';
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
  return keysetPage(page, (task) => boardCursor(boardKey(task)));
}
