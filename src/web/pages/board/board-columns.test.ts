import type { CivilDate } from '@tinyfold/core/domain';
import { readCivilDate } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import type { ColumnSummary } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { arrangeBoard, keyLayout, lateCount, placeOf } from './board-columns';

const column = (id: string, position: number, isDone = false) =>
  ({ id, name: id, position, isDone, version: 1, taskCount: 0 }) as ColumnSummary;
const task = (id: string, columnId: string, position: number, dueOn: CivilDate | null = null) =>
  ({ id, columnId, position, dueOn }) as Task;

const board = arrangeBoard(
  [column('done', 2, true), column('todo', 0), column('doing', 1)],
  [
    task('b', 'todo', 1, readCivilDate('2026-10-28')),
    task('a', 'todo', 0),
    task('d', 'done', 0, readCivilDate('2026-10-01')),
    task('x', 'gone', 0),
  ],
);

describe('the board', () => {
  it('puts the columns and their tasks in order, without tasks of other columns', () => {
    expect(keyLayout(board)).toEqual({
      columns: [
        { id: 'todo', cards: ['a', 'b'] },
        { id: 'doing', cards: [] },
        { id: 'done', cards: ['d'] },
      ],
    });
    expect(board.map((view) => view.index)).toEqual([0, 1, 2]);
  });

  it('counts the late tasks outside the done column', () => {
    expect(lateCount(board, readCivilDate('2026-11-01'))).toBe(1);
    expect(lateCount(board, readCivilDate('2026-10-28'))).toBe(0);
  });

  it('finds where a task is', () => {
    expect(placeOf(board, 'b')).toMatchObject({ column: { id: 'todo' }, index: 1, total: 2 });
    expect(placeOf(board, 'x')).toBeNull();
  });
});
