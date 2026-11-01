/**
 * The board's order (docs/etapas/10-quadro-tarefa.md, "Dados"): columns by position, and the tasks of a
 * project's column by position, IDs breaking ties, as the server orders them.
 */

interface Placed {
  id: string;
  position: number;
}

export const byPosition = (a: Placed, b: Placed) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Things in board order, without changing the list given. */
export const inBoardOrder = <T extends Placed>(list: readonly T[]) => [...list].sort(byPosition);

/** The columns' done one and, in board order, the first open one, where a task is reopened. */
export function doneAndFirstOpen<T extends Placed & { isDone: boolean }>(columns: readonly T[]) {
  const ordered = inBoardOrder(columns);
  return { done: ordered.find((column) => column.isDone), open: ordered.find((column) => !column.isDone) };
}

/**
 * The task after `task` in its project's column, by position: where an undo puts it back before
 * (docs/etapas/10-quadro-tarefa.md, decision 14), or null at the end.
 */
export function followingTask<T extends Placed & { columnId: string }>(tasks: readonly T[], task: T) {
  const column = inBoardOrder(tasks.filter((each) => each.columnId === task.columnId));
  return column[column.findIndex((each) => each.id === task.id) + 1]?.id ?? null;
}
