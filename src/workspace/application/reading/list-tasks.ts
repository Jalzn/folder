import { AppError } from '@tinyfold/core/application';
import { boardCursor, readBoardCursor } from '../../domain/paging.js';
import { keysetPage } from './keyset-page.js';
import { boardKey } from './list-order.js';
import type { ReadingContext } from './ports.js';
import { queryTerms } from './query-terms.js';
import type { ListTasksInput } from './schemas.js';

/**
 * Tasks in board order: column, then position. Pages are pinned to one board revision, since a
 * move renumbers positions and a cursor from before it would repeat or skip tasks.
 */
export async function listTasks(ctx: ReadingContext, input: ListTasksInput) {
  const cursor = input.cursor === undefined ? undefined : readBoardCursor(input.cursor);
  const terms = queryTerms(input.query);
  const { revision, page } = await ctx.read(async (reader) => {
    const current = await reader.boardRevision();
    if (cursor && cursor.revision !== current)
      throw new AppError('VERSION_CONFLICT', 'O quadro mudou desde a primeira página. Liste de novo sem cursor.');
    const tasks = await reader.tasks({
      projectId: input.projectId,
      documentId: input.documentId,
      statuses: input.status,
      terms,
      limit: input.limit,
      after: cursor?.key,
    });
    return { revision: current, page: tasks };
  });
  return keysetPage(page, (task) => boardCursor(revision, boardKey(task)));
}
