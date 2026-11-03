import { AppError } from '@tinyfold/core/application';
import { COLUMN_LIMITS, type Column } from '../../domain/columns.js';
import { assertNameFree, readName } from '../name-rules.js';
import type { ColumnRepository } from '../ports/columns.js';

/** An active column: a deleted one takes no task and cannot change. */
export async function requireActiveColumn(repo: Pick<ColumnRepository, 'findColumn'>, id: string): Promise<Column> {
  const column = await repo.findColumn(id);
  if (!column || column.deletedAt) throw new AppError('NOT_FOUND', 'A coluna não está disponível.');
  return column;
}

/** A column's name as stored: see readName. */
export const readColumnName = (raw: string): string => readName(raw, 'coluna', COLUMN_LIMITS.nameChars);

/** Refuses a name another active column has, by its key; `except` is the column being renamed. */
export const assertColumnNameFree = (columns: readonly Column[], name: string, except?: string, suffix = ''): void =>
  assertNameFree(columns, name, 'coluna', { ...(except ? { except } : {}), suffix });

/** Refuses the column after the last one the board may have. */
export function assertRoomForColumn(columns: readonly Column[]): void {
  if (columns.length >= COLUMN_LIMITS.active)
    throw new AppError('DOMAIN_RULE', `Máximo de ${COLUMN_LIMITS.active} colunas.`);
}

/** Numbers the columns in the given order from 0, writing only the positions that change. */
export async function renumberColumns(repo: ColumnRepository, ordered: readonly Column[]): Promise<void> {
  for (const [position, column] of ordered.entries())
    if (column.position !== position) await repo.setColumnPosition(column.id, position);
}

/** How far ahead of the server's clock an undo's completion may be: more is no completion it gave. */
const COMPLETION_MARGIN_MS = 60_000;

/**
 * Refuses an undo list with a completion in the future. The lists are the client's word, as with
 * folders, but every completion in them came from an earlier answer of this server, so one more than
 * a minute ahead of its clock is forged or corrupt, and the whole request is refused.
 */
export function assertPastCompletions(completions: readonly (string | null)[], now: string): void {
  const latest = Date.parse(now) + COMPLETION_MARGIN_MS;
  if (completions.some((completedAt) => completedAt !== null && Date.parse(completedAt) > latest))
    throw new AppError('VALIDATION', 'A data de conclusão não pode estar no futuro.');
}
