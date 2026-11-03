import type { CivilDate } from '@tinyfold/core/domain';
import { readCivilDate } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import { type AgendaTask, overviewTasks } from './overview-tasks.js';

const columns = [
  { id: 'todo', isDone: false, position: 0 },
  { id: 'doing', isDone: false, position: 1 },
  { id: 'review', isDone: false, position: 2 },
  { id: 'done', isDone: true, position: 3 },
];
const task = (id: string, columnId: string, position: number, dueOn: CivilDate | null = null): AgendaTask => ({
  id,
  title: `Tarefa ${id}`,
  columnId,
  position,
  dueOn,
});
const ids = (tasks: readonly AgendaTask[]) => tasks.map((item) => item.id);
const today = readCivilDate('2026-11-01');

describe('Agora in the overview', () => {
  it('shows the overdue first, then the other open columns, then the first column due soon', () => {
    const { now, rest } = overviewTasks(
      [
        task('soon-late', 'todo', 0, readCivilDate('2026-11-12')),
        task('soon', 'todo', 1, readCivilDate('2026-11-05')),
        task('far', 'todo', 2, readCivilDate('2026-11-30')),
        task('none', 'todo', 3),
        task('late-2', 'doing', 0, readCivilDate('2026-10-30')),
        task('doing', 'doing', 1),
        task('late-1', 'review', 0, readCivilDate('2026-10-20')),
        task('review', 'review', 1, readCivilDate('2026-11-20')),
        task('done', 'done', 0, readCivilDate('2026-10-01')),
      ],
      columns,
      today,
    );
    expect(ids(now)).toEqual(['late-1', 'late-2', 'doing', 'review', 'soon', 'soon-late']);
    expect(rest).toEqual([{ columnId: 'todo', count: 2, withoutDue: 1, only: null }]);
  });

  it('keeps 6 and sums up the rest per column, naming a single one with a due date', () => {
    const many = Array.from({ length: 7 }, (_, index) => task(`d${index}`, 'doing', index));
    const { now, rest } = overviewTasks([...many, task('t', 'todo', 0, readCivilDate('2026-12-25'))], columns, today);
    expect(ids(now)).toEqual(['d0', 'd1', 'd2', 'd3', 'd4', 'd5']);
    expect(rest).toEqual([
      { columnId: 'todo', count: 1, withoutDue: 0, only: { title: 'Tarefa t', dueOn: readCivilDate('2026-12-25') } },
      { columnId: 'doing', count: 1, withoutDue: 1, only: null },
    ]);
  });

  it('is empty for a board with no open tasks', () => {
    expect(overviewTasks([task('done', 'done', 0)], columns, today)).toEqual({ now: [], rest: [] });
  });
});
