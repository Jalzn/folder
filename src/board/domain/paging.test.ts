import { describe, expect, it } from 'vitest';
import { readIsoInstant } from '#core/domain';
import { boardCursor, completedCursor, readBoardCursor, readCompletedCursor } from './paging.js';

describe('board cursors', () => {
  const id = '3f9e2c1a-0b4d-4e5f-8a6b-7c8d9e0f1a2b';
  it('round trips the board revision, column and task position', () => {
    const key = { columnRank: 1, position: 7, id };
    expect(boardCursor(42, key)).toBe(`t~42~1~7~${id}`);
    expect(readBoardCursor(boardCursor(42, key))).toEqual({ revision: 42, key });
  });
  it('refuses malformed cursors and cursors of another list', () => {
    expect(readBoardCursor(`t~1~19~7~${id}`).key.columnRank).toBe(19);
    for (const cursor of [`s~0~2026-10-31T06:41:25.403Z~0~${id}`, `t~1~20~7~${id}`, `t~1~7~${id}`])
      expect(() => readBoardCursor(cursor)).toThrow('Cursor inválido');
  });
});

describe('completed tasks cursor', () => {
  it('keeps the completion and the ID, and refuses any other cursor', () => {
    const key = { completedAt: readIsoInstant('2026-10-31T06:41:25.403Z'), id: '00000000-0000-4000-8000-000000000010' };
    expect(completedCursor(key)).toBe(`c~2026-10-31T06:41:25.403Z~${key.id}`);
    expect(readCompletedCursor(completedCursor(key))).toEqual(key);
    for (const cursor of ['c~2026-10-31~x', `t~1~0~0~${key.id}`, ''])
      expect(() => readCompletedCursor(cursor)).toThrow('Cursor inválido');
  });
});
