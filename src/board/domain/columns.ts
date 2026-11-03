import type { IsoInstant } from '#core/domain';
/**
 * A board column. Columns are the same for every project: the board of a project is its tasks in
 * them. There is always one done column and at least one open column. A deleted column keeps its
 * row and last position, for the undo.
 */
export interface Column {
  id: string;
  name: string;
  /** Manual order among the active columns, from 0. */
  position: number;
  /** Whether it is the done column: its tasks are completed, and only it has completedAt. */
  isDone: boolean;
  version: number;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
}

/** Bounds of columns: the name, the active columns, and the tasks a deletion or a done switch lists. */
export const COLUMN_LIMITS = {
  nameChars: 60,
  /** Also what the t~… cursor of list_tasks keeps of a column: its position, in two digits. */
  active: 20,
  listedTasks: 1_000,
} as const;

/**
 * The three columns of a new installation, and of migration 007, which placed the old statuses in
 * them. After it they are ordinary columns: no rule depends on these IDs.
 */
export const INITIAL_COLUMN_IDS = {
  todo: '00000000-0000-4000-8000-000000000010',
  doing: '00000000-0000-4000-8000-000000000011',
  done: '00000000-0000-4000-8000-000000000012',
} as const;

/** The active columns in board order: by position, IDs breaking ties. */
export const byColumnOrder = (a: Column, b: Column) => a.position - b.position || (a.id < b.id ? -1 : 1);

/**
 * Where a new column goes among the active ones, in board order: before the done column when it is
 * the last one, as the prototype adds columns, and at the end otherwise.
 */
export function newColumnPosition(columns: readonly Pick<Column, 'isDone'>[]): number {
  const last = columns.at(-1);
  return last?.isDone ? columns.length - 1 : columns.length;
}

/** The first open column in board order, where a task goes by default and when it is reopened. */
export const firstOpenColumn = <T extends Pick<Column, 'isDone'>>(columns: readonly T[]): T | undefined =>
  columns.find((column) => !column.isDone);

/**
 * Why a column cannot be deleted, if it cannot: it is the done column, or the last open one, since
 * the board keeps one of each. `active` holds the active columns, the column among them.
 */
export function columnDeletionBlocker(
  column: Pick<Column, 'isDone'>,
  active: readonly Pick<Column, 'isDone'>[],
): 'done' | 'lastOpen' | undefined {
  if (column.isDone) return 'done';
  if (active.filter((item) => !item.isDone).length <= 1) return 'lastOpen';
  return undefined;
}
