import { addDays } from '@tinyfold/core/domain';
import type { Column } from './columns.js';
import { byPosition } from './order.js';
import { isOverdue } from './task-dates.js';

/** What "Agora" needs of a task: its column, place and due date. */
export interface AgendaTask {
  id: string;
  title: string;
  columnId: string;
  position: number;
  dueOn: string | null;
}

/** An open column's tasks that "Agora" leaves out: how many, how many without a due date, and the one. */
export interface LeftOut {
  columnId: string;
  count: number;
  withoutDue: number;
  /** The only task left out, when there is one and it has a due date: "Mais 1 em A fazer: …, 15 nov.". */
  only: { title: string; dueOn: string } | null;
}

/** How many tasks "Agora" shows, and how far ahead it looks in the first open column. */
export const AGENDA = { limit: 6, soonDays: 14 } as const;

/**
 * The tasks of the overview's "Agora", as the prototype's agoraTasks picks them, from a project's open
 * tasks and the active columns in board order:
 *
 * 1. the overdue ones, by due date;
 * 2. those in the open columns that are not the first, in board order;
 * 3. those in the first open column due within the next 14 days, by due date.
 *
 * At most AGENDA.limit; the rest is summed up per open column, in board order.
 */
export function overviewTasks<T extends AgendaTask>(
  tasks: readonly T[],
  columns: readonly Pick<Column, 'id' | 'isDone' | 'position'>[],
  today: string,
): { now: T[]; rest: LeftOut[] } {
  const open = columns.filter((column) => !column.isDone);
  const columnRank = new Map(open.map((column, index) => [column.id, index]));
  const byBoard = (a: T, b: T) =>
    (columnRank.get(a.columnId) ?? 0) - (columnRank.get(b.columnId) ?? 0) || byPosition(a, b) || (a.id < b.id ? -1 : 1);
  const byDue = (a: T, b: T) => (a.dueOn ?? '9').localeCompare(b.dueOn ?? '9') || byBoard(a, b);
  const inOpen = tasks.filter((task) => columnRank.has(task.columnId)).sort(byBoard);
  const late = (task: T) => isOverdue(task.dueOn, today, false);
  const first = open[0]?.id;
  const soonUntil = addDays(today, AGENDA.soonDays);
  const overdue = inOpen.filter(late).sort(byDue);
  const middle = inOpen.filter((task) => task.columnId !== first && !late(task));
  const soon = inOpen
    .filter((task) => task.columnId === first && !late(task) && task.dueOn !== null && task.dueOn <= soonUntil)
    .sort(byDue);
  const now = [...overdue, ...middle, ...soon].slice(0, AGENDA.limit);
  const shown = new Set(now.map((task) => task.id));
  const rest = open.flatMap((column): LeftOut[] => {
    const left = inOpen.filter((task) => task.columnId === column.id && !shown.has(task.id));
    if (!left.length) return [];
    const [one] = left;
    return [
      {
        columnId: column.id,
        count: left.length,
        withoutDue: left.filter((task) => task.dueOn === null).length,
        only: left.length === 1 && one?.dueOn ? { title: one.title, dueOn: one.dueOn } : null,
      },
    ];
  });
  return { now, rest };
}
