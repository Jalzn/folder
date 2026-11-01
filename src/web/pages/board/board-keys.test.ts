import { describe, expect, it } from 'vitest';
import { AT_END, AT_TOP, beforeCardAt, boardKey, type KeyPress, NO_COLUMN_THERE } from './board-keys';

const layout = {
  columns: [
    { id: 'todo', cards: ['a', 'b', 'c'] },
    { id: 'doing', cards: [] },
    { id: 'review', cards: ['d'] },
    { id: 'done', cards: ['e', 'f'] },
  ],
};
const press = (key: string, extra: Partial<KeyPress> = {}): KeyPress => ({
  key,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ctrlKey: false,
  ...extra,
});
const card = (id: string) => ({ kind: 'card' as const, id });
const column = (id: string) => ({ kind: 'column' as const, id });

describe('boardKey', () => {
  it('walks the cards of a column, and ↑ on the first goes to the column’s name', () => {
    expect(boardKey(layout, card('a'), press('ArrowDown'), true)).toEqual({ kind: 'focus', target: card('b') });
    expect(boardKey(layout, card('c'), press('ArrowDown'), true)).toBeNull();
    expect(boardKey(layout, card('b'), press('ArrowUp'), true)).toEqual({ kind: 'focus', target: card('a') });
    expect(boardKey(layout, card('a'), press('ArrowUp'), true)).toEqual({ kind: 'focus', target: column('todo') });
  });

  it('goes sideways to the nearest column with cards, at the same height or its last card', () => {
    expect(boardKey(layout, card('c'), press('ArrowRight'), true)).toEqual({ kind: 'focus', target: card('d') });
    expect(boardKey(layout, card('d'), press('ArrowLeft'), true)).toEqual({ kind: 'focus', target: card('a') });
    expect(boardKey(layout, card('b'), press('ArrowRight'), true)).toEqual({ kind: 'focus', target: card('d') });
    expect(boardKey(layout, card('f'), press('ArrowRight'), true)).toBeNull();
  });

  it('moves a card with ⇧ and the arrows, and says so at the ends', () => {
    expect(boardKey(layout, card('b'), press('ArrowRight', { shiftKey: true }), true)).toEqual({
      kind: 'move-card',
      id: 'b',
      columnId: 'doing',
      index: 0,
      within: false,
    });
    expect(boardKey(layout, card('a'), press('ArrowLeft', { shiftKey: true }), true)).toEqual({
      kind: 'say',
      text: NO_COLUMN_THERE,
    });
    expect(boardKey(layout, card('a'), press('ArrowDown', { shiftKey: true }), true)).toEqual({
      kind: 'move-card',
      id: 'a',
      columnId: 'todo',
      index: 1,
      within: true,
    });
    expect(boardKey(layout, card('a'), press('ArrowUp', { shiftKey: true }), true)).toEqual({
      kind: 'say',
      text: AT_TOP,
    });
    expect(boardKey(layout, card('c'), press('ArrowDown', { shiftKey: true }), true)).toEqual({
      kind: 'say',
      text: AT_END,
    });
  });

  it('opens the menus and completes with ⌘↵, Ctrl+↵ off Apple', () => {
    expect(boardKey(layout, card('a'), press('m'), true)).toEqual({ kind: 'move-menu', id: 'a' });
    expect(boardKey(layout, card('a'), press('F10', { shiftKey: true }), true)).toEqual({ kind: 'card-menu', id: 'a' });
    expect(boardKey(layout, card('a'), press('Enter', { metaKey: true }), true)).toEqual({
      kind: 'toggle-done',
      id: 'a',
    });
    expect(boardKey(layout, card('a'), press('Enter', { ctrlKey: true }), false)).toEqual({
      kind: 'toggle-done',
      id: 'a',
    });
    expect(boardKey(layout, card('a'), press('Enter'), true)).toBeNull();
  });

  it('walks and moves the columns from their names', () => {
    expect(boardKey(layout, column('todo'), press('ArrowDown'), true)).toEqual({ kind: 'focus', target: card('a') });
    expect(boardKey(layout, column('doing'), press('ArrowDown'), true)).toBeNull();
    expect(boardKey(layout, column('doing'), press('ArrowRight'), true)).toEqual({
      kind: 'focus',
      target: column('review'),
    });
    expect(boardKey(layout, column('review'), press('ArrowLeft', { shiftKey: true }), true)).toEqual({
      kind: 'move-column',
      id: 'review',
      index: 1,
    });
    expect(boardKey(layout, column('done'), press('ArrowRight', { shiftKey: true }), true)).toEqual({
      kind: 'say',
      text: NO_COLUMN_THERE,
    });
    expect(boardKey(layout, column('done'), press('ContextMenu'), true)).toEqual({ kind: 'column-menu', id: 'done' });
  });
});

describe('beforeCardAt', () => {
  it('finds the card a move goes before, without the moved card', () => {
    expect(beforeCardAt(layout, 'a', 'todo', 1)).toBe('c');
    expect(beforeCardAt(layout, 'c', 'todo', 1)).toBe('b');
    expect(beforeCardAt(layout, 'b', 'review', 0)).toBe('d');
    expect(beforeCardAt(layout, 'b', 'review', 1)).toBeNull();
  });
});
