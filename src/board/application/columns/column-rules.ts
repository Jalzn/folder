import { namedCollection, renumber } from '@tinyfold/core/application';
import type { IsoInstant } from '@tinyfold/core/domain';
import { COLUMN_LIMITS, type Column } from '../../domain/columns.js';
import { boardErrors } from '../errors.js';
import type { ColumnRepository } from '../ports/columns.js';

/** An active column: a deleted one takes no task and cannot change. */
export async function requireActiveColumn(repo: Pick<ColumnRepository, 'findColumn'>, id: string): Promise<Column> {
  const column = await repo.findColumn(id);
  if (!column || column.deletedAt) throw boardErrors.columnMissing();
  return column;
}

/** Numbers the columns in the given order from 0, writing only the positions that change. */
export async function renumberColumns(repo: ColumnRepository, ordered: readonly Column[]): Promise<void> {
  await renumber(ordered, (id, position) => repo.setColumnPosition(id, position));
}

/** How far ahead of the server's clock an undo's completion may be: more is no completion it gave. */
const COMPLETION_MARGIN_MS = 60_000;

/**
 * Refuses an undo list with a completion in the future. The lists are the client's word, as with
 * folders, but every completion in them came from an earlier answer of this server, so one more than
 * a minute ahead of its clock is forged or corrupt, and the whole request is refused.
 */
export function assertPastCompletions(completions: readonly (string | null)[], now: IsoInstant): void {
  const latest = Date.parse(now) + COMPLETION_MARGIN_MS;
  if (completions.some((completedAt) => completedAt !== null && Date.parse(completedAt) > latest))
    throw boardErrors.futureCompletion();
}
const collection = namedCollection({
  thing: 'coluna',
  maxChars: COLUMN_LIMITS.nameChars,
  limit: COLUMN_LIMITS.active,
  fullMessage: `Máximo de ${COLUMN_LIMITS.active} colunas.`,
});
export const readColumnName = collection.readName;
export const assertColumnNameFree = collection.assertNameFree;
export const assertRoomForColumn = collection.assertRoom;
