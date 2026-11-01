import { type Column, firstOpenColumn } from './columns.js';
import { nameKey } from './names.js';

/** Until B6: the statuses of stage 09, which the interface of that stage still sends and reads. */
export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Concluído',
};

/**
 * Until B6, for the interface of stage 09: the status a column reads as. The done column is "done";
 * the columns named "A fazer" and "Em andamento" are "todo" and "doing"; any other open column is
 * "todo" when it is the first, "doing" otherwise. `columns` are the active ones in board order.
 */
export function statusOfColumn(
  columns: readonly Pick<Column, 'id' | 'name' | 'isDone'>[],
  columnId: string,
): TaskStatus {
  const column = columns.find((candidate) => candidate.id === columnId);
  if (!column || column.isDone) return column ? 'done' : 'doing';
  const key = nameKey(column.name);
  if (key === STATUS_KEYS.todo) return 'todo';
  if (key === STATUS_KEYS.doing) return 'doing';
  return column === firstOpenColumn(columns) ? 'todo' : 'doing';
}

/**
 * Until B6: the column a stage 09 status stands for. "done" is the done column; "todo" the column
 * named "A fazer", or the first open one; "doing" the one named "Em andamento", or the open column
 * after the first, or the first.
 */
export function columnOfStatus(
  columns: readonly Pick<Column, 'id' | 'name' | 'isDone'>[],
  status: TaskStatus,
): string | undefined {
  if (status === 'done') return columns.find((column) => column.isDone)?.id;
  const open = columns.filter((column) => !column.isDone);
  const named = open.find((column) => nameKey(column.name) === STATUS_KEYS[status]);
  return (named ?? (status === 'doing' ? (open[1] ?? open[0]) : open[0]))?.id;
}

const STATUS_KEYS = { todo: 'a fazer', doing: 'em andamento' } as const;
