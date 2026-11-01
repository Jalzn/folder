import { describe, expect, it } from 'vitest';
import { rowKind, type TreeKey, treeKeyAction, typesAhead } from './tree-keys';

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

describe('treeKeyAction during a type-to-select search', () => {
  const typing = { ...calm, typing: true };
  it('keeps N, P, M and G with the search while it goes on, and gives them back after the pause', () => {
    for (const key of ['n', 'p', 'm', 'g']) {
      expect(treeKeyAction(press(key), 'item', typing)).toBeNull();
      expect(treeKeyAction(press(key), 'item', calm)).not.toBeNull();
    }
    expect(treeKeyAction(press('n'), 'folder', typing)).toBeNull();
  });

  it('still lets a waiting G chord and the keys that are no letters act', () => {
    expect(treeKeyAction(press('v'), 'item', { ...typing, chordPending: true })).toBe('forward');
    expect(treeKeyAction(press('F2'), 'folder', typing)).toBe('rename');
    expect(treeKeyAction(press('ArrowRight'), 'item', typing)).toBe('swallow');
  });

  it('tells which keys go on a search', () => {
    expect(typesAhead(press('p'))).toBe(true);
    expect(typesAhead(press('7'))).toBe(true);
    expect(typesAhead(press(' '))).toBe(false);
    expect(typesAhead(press('Enter'))).toBe(false);
    expect(typesAhead(press('p', { metaKey: true }))).toBe(false);
  });
});

describe('treeKeyAction on an open folder', () => {
  it('takes → to the first child instead of the buttons of the row, and leaves a closed one to open', () => {
    expect(treeKeyAction(press('ArrowRight'), 'folder', { ...calm, expanded: true })).toBe('first-child');
    expect(treeKeyAction(press('ArrowRight'), 'folder', { ...calm, expanded: false })).toBeNull();
    expect(treeKeyAction(press('ArrowRight', { shiftKey: true }), 'folder', { ...calm, expanded: true })).toBeNull();
  });
});
