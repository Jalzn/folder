import { isOverdue } from '@tinyfold/board/domain';
import type { CivilDate } from '@tinyfold/core/domain';
import { inBoardOrder } from '../../lib/board-order';
import type { ColumnSummary } from '../../lib/queries';
import type { Task } from '../../lib/types';
import type { BoardLayout } from './board-keys';

/** A column of the board: its place among the columns, for the ring, and the project's tasks in it. */
export interface BoardColumnView {
  column: ColumnSummary;
  index: number;
  tasks: Task[];
}

/** The columns in board order, each with the project's tasks in it in order. */
export function arrangeBoard(columns: readonly ColumnSummary[], tasks: readonly Task[]): BoardColumnView[] {
  const byColumn = new Map<string, Task[]>(columns.map((column) => [column.id, []]));
  for (const task of tasks) byColumn.get(task.columnId)?.push(task);
  return inBoardOrder(columns).map((column, index) => ({
    column,
    index,
    tasks: inBoardOrder(byColumn.get(column.id) ?? []),
  }));
}

/** What the board's keys walk: the columns' IDs with their cards'. */
export const keyLayout = (board: readonly BoardColumnView[]): BoardLayout => ({
  columns: board.map(({ column, tasks }) => ({ id: column.id, cards: tasks.map((task) => task.id) })),
});

/** How many of the board's tasks are late today: due before today, outside the done column. */
export const lateCount = (board: readonly BoardColumnView[], today: CivilDate) =>
  board.reduce(
    (late, { column, tasks }) => late + tasks.filter((task) => isOverdue(task.dueOn, today, column.isDone)).length,
    0,
  );

/** Where a task is on the board: its column, its place in it and how many are there. */
export function placeOf(board: readonly BoardColumnView[], id: string) {
  for (const view of board) {
    const index = view.tasks.findIndex((task) => task.id === id);
    if (index >= 0) return { column: view.column, index, total: view.tasks.length };
  }
  return null;
}
