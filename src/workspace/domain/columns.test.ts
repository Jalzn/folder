import { describe, expect, it } from 'vitest';
import { firstOpenColumn, newColumnPosition } from './columns.js';

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
});
