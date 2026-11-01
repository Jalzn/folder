import { describe, expect, it } from 'vitest';
import { boardDrop } from './board-drop';

const columns = [
  {
    id: 'todo',
    left: 0,
    right: 200,
    cards: [
      { id: 'a', top: 0, bottom: 40 },
      { id: 'b', top: 48, bottom: 88 },
      { id: 'c', top: 96, bottom: 136 },
    ],
  },
  { id: 'doing', left: 212, right: 412, cards: [] },
];

describe('boardDrop', () => {
  it('goes before the first card whose middle is below the pointer', () => {
    expect(boardDrop(columns, { x: 50, y: 60 }, 'z')).toEqual({ columnId: 'todo', beforeTaskId: 'b', same: false });
    expect(boardDrop(columns, { x: 50, y: 75 }, 'z')).toEqual({ columnId: 'todo', beforeTaskId: 'c', same: false });
  });

  it('goes to the end below the last card, and into an empty column', () => {
    expect(boardDrop(columns, { x: 50, y: 300 }, 'z')).toEqual({ columnId: 'todo', beforeTaskId: null, same: false });
    expect(boardDrop(columns, { x: 300, y: 10 }, 'a')).toEqual({ columnId: 'doing', beforeTaskId: null, same: false });
  });

  it('knows a drop on the card’s own place changes nothing', () => {
    expect(boardDrop(columns, { x: 50, y: 30 }, 'b')).toMatchObject({ beforeTaskId: 'c', same: true });
    expect(boardDrop(columns, { x: 50, y: 60 }, 'a')).toMatchObject({ beforeTaskId: 'b', same: true });
    expect(boardDrop(columns, { x: 50, y: 300 }, 'c')).toMatchObject({ beforeTaskId: null, same: true });
    expect(boardDrop(columns, { x: 50, y: 10 }, 'b')).toMatchObject({ beforeTaskId: 'a', same: false });
  });

  it('is nowhere between or outside the columns', () => {
    expect(boardDrop(columns, { x: 206, y: 10 }, 'a')).toBeNull();
  });
});
