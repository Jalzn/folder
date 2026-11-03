import { AppError } from '@tinyfold/core/application';
import { boardKey } from '../../domain/list-order.js';
import { nameKey } from '../../domain/names.js';
import { boardCursor, readBoardCursor } from '../../domain/paging.js';
import { workspaceErrors } from '../errors.js';
import { keysetPage } from './keyset-page.js';
import { optionalCursor } from './optional-cursor.js';
import type { ReadingContext } from './ports.js';
import { queryTerms } from './query-terms.js';
import type { ListTasksInput } from './schemas.js';

/**
 * The IDs of the named columns or labels, compared by their key as names are. A name that matches
 * none is refused, listing the ones there are.
 */
function idsByName(
  names: readonly string[] | undefined,
  known: readonly { id: string; name: string }[],
  missing: string,
  listed: string,
): string[] | undefined {
  if (!names) return undefined;
  const byKey = new Map(known.map((item) => [nameKey(item.name), item.id]));
  return names.map((name) => {
    const id = byKey.get(nameKey(name));
    if (id) return id;
    const all = known.length ? known.map((item) => item.name).join(', ') : 'nenhuma';
    throw new AppError('NOT_FOUND', `${missing}: ${name}. ${listed}: ${all}.`);
  });
}

/**
 * Tasks in board order: the column's position, then the position within it. Pages are pinned to one
 * board revision, since a move renumbers positions and a cursor from before it would repeat or skip
 * tasks; moving, deleting or restoring a column changes the revision too. Columns and labels are
 * filtered by the names seen in Tinyfold: any of the columns, all of the labels. The page comes with
 * the active columns, in board order, and the owner's `today`, for overdue tasks.
 */
export async function listTasks(ctx: ReadingContext, input: ListTasksInput) {
  const cursor = optionalCursor(input.cursor, readBoardCursor);
  const terms = queryTerms(input.query);
  const { today } = await ctx.calendar();
  const { revision, columns, page } = await ctx.read(async (reader) => {
    const current = await reader.boardRevision();
    if (cursor && cursor.revision !== current) throw workspaceErrors.boardPageChanged();
    const active = await reader.columns();
    const tasks = await reader.tasks({
      projectId: input.projectId,
      documentId: input.documentId,
      columnIds: idsByName(input.columns, active, 'Coluna não encontrada', 'Colunas'),
      labelIds: idsByName(input.labels, await reader.labels(), 'Etiqueta não encontrada', 'Etiquetas'),
      terms,
      limit: input.limit,
      after: cursor?.key,
    });
    return { revision: current, columns: active, page: tasks };
  });
  return { ...keysetPage(page, (task) => boardCursor(revision, boardKey(task))), columns, today };
}
