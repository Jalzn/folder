import { describe, expect, it } from 'vitest';
import { doneAndFirstOpen, followingTask, inBoardOrder } from './board-order';

describe('board order', () => {
  it('orders by position, IDs breaking ties', () => {
    const list = [
      { id: 'b', position: 1 },
      { id: 'c', position: 0 },
      { id: 'a', position: 1 },
    ];
    expect(inBoardOrder(list).map((each) => each.id)).toEqual(['c', 'a', 'b']);
  });

  it('finds the done column and the first open one', () => {
    const columns = [
      { id: 'done', position: 0, isDone: true },
      { id: 'later', position: 2, isDone: false },
      { id: 'first', position: 1, isDone: false },
    ];
    expect(doneAndFirstOpen(columns)).toMatchObject({ done: { id: 'done' }, open: { id: 'first' } });
  });

  it('finds the next task of the same column', () => {
    const tasks = [
      { id: 'a', position: 0, columnId: 'todo' },
      { id: 'x', position: 1, columnId: 'doing' },
      { id: 'c', position: 2, columnId: 'todo' },
      { id: 'b', position: 1, columnId: 'todo' },
    ];
    expect(followingTask(tasks, tasks[0] as (typeof tasks)[number])).toBe('b');
    expect(followingTask(tasks, tasks[2] as (typeof tasks)[number])).toBeNull();
  });
});
