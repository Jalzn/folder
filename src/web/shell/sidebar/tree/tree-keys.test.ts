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
const calm = { first: false, chordPending: false, inFolder: false, editable: true };

describe('treeKeyAction', () => {
  it('hands N, G, / and ? to the shortcuts, on any row', () => {
    for (const key of ['g', '/'])
      for (const row of ['item', 'folder'] as const) expect(treeKeyAction(press(key), row, calm)).toBe('forward');
    expect(treeKeyAction(press('n'), 'item', calm)).toBe('forward');
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

describe('folder keys', () => {
  it('opens the Novo menu in the folder with N, on the folder or inside it', () => {
    expect(treeKeyAction(press('n'), 'folder', calm)).toBe('new-here');
    expect(treeKeyAction(press('n'), 'item', { ...calm, inFolder: true })).toBe('new-here');
    expect(treeKeyAction(press('n'), 'item', calm)).toBe('forward');
    expect(treeKeyAction(press('n'), 'folder', { ...calm, editable: false })).toBe('forward');
  });

  it('renames, reorders and opens the menu of a folder', () => {
    expect(treeKeyAction(press('F2'), 'folder', calm)).toBe('rename');
    expect(treeKeyAction(press('ArrowUp', { altKey: true }), 'folder', calm)).toBe('move-up');
    expect(treeKeyAction(press('ArrowDown', { altKey: true }), 'folder', calm)).toBe('move-down');
    expect(treeKeyAction(press('F10', { shiftKey: true }), 'folder', calm)).toBe('menu');
    expect(treeKeyAction(press('ContextMenu'), 'folder', calm)).toBe('menu');
  });

  it('leaves those keys alone on items and in an archived project', () => {
    expect(treeKeyAction(press('F2'), 'item', calm)).toBeNull();
    expect(treeKeyAction(press('ArrowUp', { altKey: true }), 'item', calm)).toBeNull();
    expect(treeKeyAction(press('F2'), 'folder', { ...calm, editable: false })).toBeNull();
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
