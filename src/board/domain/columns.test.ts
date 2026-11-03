import { describe, expect, it } from 'vitest';
import { columnDeletionBlocker, firstOpenColumn, newColumnPosition } from './columns.js';

describe('columns', () => {
  it('puts a new column before the done column when it is the last, and at the end otherwise', () => {
    const open = { isDone: false };
    const done = { isDone: true };
    expect(newColumnPosition([open, open, done])).toBe(2);
    expect(newColumnPosition([open, done, open])).toBe(3);
    expect(newColumnPosition([done])).toBe(0);
  });

  it('finds the first open column in board order', () => {
    const columns = [
      { id: 'c', isDone: true },
      { id: 'a', isDone: false },
      { id: 'b', isDone: false },
    ];
    expect(firstOpenColumn(columns)?.id).toBe('a');
    expect(firstOpenColumn([{ id: 'c', isDone: true }])).toBeUndefined();
  });
  it('keeps the done column and the last open one from being deleted', () => {
    const done = { isDone: true };
    const open = { isDone: false };
    const other = { isDone: false };
    expect(columnDeletionBlocker(done, [open, other, done])).toBe('done');
    expect(columnDeletionBlocker(open, [open, done])).toBe('lastOpen');
    expect(columnDeletionBlocker(open, [open, other, done])).toBeUndefined();
  });
});
