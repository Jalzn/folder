import type { Kysely } from 'kysely';
import type { Column } from '../domain/columns.js';
import type { TaskStatus } from '../domain/models.js';
import { statusOfColumn } from '../domain/task-status.js';
import type { WorkspaceTables } from './db.js';
import { activeColumnRows } from './repository/columns.js';
import { columnModel } from './repository/mappers.js';

/**
 * Until B6: the active columns, and the stage 09 status each reads as, for the reads that still
 * answer statuses (see statusOfColumn).
 */
export async function taskStatuses(db: Kysely<WorkspaceTables>) {
  const columns: Column[] = (await activeColumnRows(db)).map(columnModel);
  return {
    columns,
    statusOf: (columnId: string): TaskStatus => statusOfColumn(columns, columnId),
    /** The columns that read as any of `statuses`, in board order. */
    columnsWith: (statuses: readonly TaskStatus[]) =>
      columns.filter((column) => statuses.includes(statusOfColumn(columns, column.id))).map((column) => column.id),
  };
}
