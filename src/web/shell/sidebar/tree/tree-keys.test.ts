import { describe, expect, it } from 'vitest';
import { rowKind, type TreeKey, treeKeyAction } from './tree-keys';

const press = (key: string, modifiers: Partial<TreeKey> = {}): TreeKey => ({
  key,
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...modifiers,
});
const calm = { first: false, chordPending: false };

describe('treeKeyAction', () => {
  it('hands N, G, / and ? to the shortcuts, on any row', () => {
    for (const key of ['g', '/'])
      for (const row of ['item', 'folder'] as const) expect(treeKeyAction(press(key), row, calm)).toBe('forward');
    expect(treeKeyAction(press('n'), 'item', calm)).toBe('forward');
    expect(treeKeyAction(press('n'), 'folder', calm)).toBe('forward');
    expect(treeKeyAction(press('?', { shiftKey: true }), 'item', calm)).toBe('forward');
  });

  it('hands any letter to the shortcuts while a G chord waits', () => {
    expect(treeKeyAction(press('v'), 'folder', { ...calm, chordPending: true })).toBe('forward');
    expect(treeKeyAction(press('1'), 'item', { ...calm, chordPending: true })).toBe('forward');
  });

  it('leaves other letters to type-to-select', () => {
    expect(treeKeyAction(press('v'), 'item', calm)).toBeNull();
    expect(treeKeyAction(press('a'), 'folder', calm)).toBeNull();
  });

  it('pins and moves the item in focus with P and M, and does nothing with them elsewhere', () => {
    expect(treeKeyAction(press('p'), 'item', calm)).toBe('pin');
    expect(treeKeyAction(press('m'), 'item', calm)).toBe('move');
    expect(treeKeyAction(press('p'), 'folder', calm)).toBe('swallow');
    expect(treeKeyAction(press('m'), 'more', calm)).toBe('swallow');
    expect(treeKeyAction(press('P', { shiftKey: true }), 'item', calm)).toBe('swallow');
  });

  it('keeps arrows, Enter and modified keys with the tree, but not → into an item’s link', () => {
    expect(treeKeyAction(press('ArrowDown'), 'item', calm)).toBeNull();
    expect(treeKeyAction(press('ArrowRight'), 'folder', calm)).toBeNull();
    expect(treeKeyAction(press('ArrowRight'), 'item', calm)).toBe('swallow');
    expect(treeKeyAction(press('ArrowRight'), 'empty', calm)).toBeNull();
    expect(treeKeyAction(press('Enter'), 'item', calm)).toBeNull();
    expect(treeKeyAction(press('k', { metaKey: true }), 'item', calm)).toBeNull();
  });

  it('goes back up to the navigation from the first row', () => {
    expect(treeKeyAction(press('ArrowUp'), 'item', { ...calm, first: true })).toBe('leave-up');
    expect(treeKeyAction(press('ArrowUp'), 'item', calm)).toBeNull();
  });
});

describe('rowKind', () => {
  it('reads the kind from the row key', () => {
    expect(rowKind('item:document:a')).toBe('item');
    expect(rowKind('folder:f')).toBe('folder');
    expect(rowKind('more:root')).toBe('more');
    expect(rowKind('empty:f')).toBe('empty');
    expect(rowKind('other')).toBeNull();
  });
});
