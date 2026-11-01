import type { NavFolder, NavItem } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { type DragSource, dropResult, dropsIntoFolder } from './tree-drop';
import { treeRows } from './tree-rows';

const item = (id: string, folderId: string | null = null, pinned = false): NavItem => ({
  type: 'document',
  id,
  title: id,
  updatedAt: '2026-10-31T10:00:00Z',
  createdAt: '2026-10-31T10:00:00Z',
  pinnedAt: pinned ? '2026-10-31T10:00:00Z' : null,
  folderId,
});
const folder = (id: string, items: NavItem[]): NavFolder => ({
  id,
  name: id,
  position: 0,
  version: 1,
  total: items.length,
  items,
});
const rows = treeRows(
  {
    total: 5,
    pinned: [item('pin', null, true)],
    folders: [folder('a', [item('a1', 'a')]), folder('b', []), folder('c', [])],
    loose: { total: 1, items: [item('loose')] },
  },
  null,
  new Set(['a', 'b']),
  [],
);
const loose: DragSource = { kind: 'item', key: 'item:document:loose', folderId: null };
const child: DragSource = { kind: 'item', key: 'item:document:a1', folderId: 'a' };
const folderB: DragSource = { kind: 'folder', key: 'folder:b', id: 'b' };

describe('dropResult', () => {
  it('puts an item on a folder into it', () => {
    expect(dropResult(loose, { key: 'folder:b', position: 'on' }, rows)).toEqual({ kind: 'into', folderId: 'b' });
  });

  it('puts an item between a folder’s children, or on its empty row, into that folder', () => {
    expect(dropResult(loose, { key: 'item:document:a1', position: 'after' }, rows)).toEqual({
      kind: 'into',
      folderId: 'a',
    });
    expect(dropResult(loose, { key: 'empty:b', position: 'on' }, rows)).toEqual({ kind: 'into', folderId: 'b' });
  });

  it('puts an item between the root’s rows at the root', () => {
    expect(dropResult(child, { key: 'item:document:pin', position: 'before' }, rows)).toEqual({
      kind: 'into',
      folderId: null,
    });
    expect(dropResult(child, { key: 'item:document:loose', position: 'after' }, rows)).toEqual({
      kind: 'into',
      folderId: null,
    });
  });

  it('refuses an item between folder rows, on another item, or where it already is', () => {
    expect(dropResult(loose, { key: 'folder:b', position: 'before' }, rows)).toBeNull();
    expect(dropResult(loose, { key: 'item:document:pin', position: 'on' }, rows)).toBeNull();
    expect(dropResult(loose, { key: 'item:document:pin', position: 'after' }, rows)).toBeNull();
    expect(dropResult(child, { key: 'folder:a', position: 'on' }, rows)).toBeNull();
  });

  it('reorders a folder between other folders', () => {
    expect(dropResult(folderB, { key: 'folder:a', position: 'before' }, rows)).toEqual({
      kind: 'reorder',
      folderId: 'b',
      beforeFolderId: 'a',
    });
    expect(dropResult(folderB, { key: 'folder:c', position: 'after' }, rows)).toEqual({
      kind: 'reorder',
      folderId: 'b',
      beforeFolderId: null,
    });
  });

  it('refuses a folder on another folder, among items, or where it already is', () => {
    expect(dropResult(folderB, { key: 'folder:a', position: 'on' }, rows)).toBeNull();
    expect(dropResult(folderB, { key: 'item:document:loose', position: 'after' }, rows)).toBeNull();
    expect(dropResult(folderB, { key: 'folder:c', position: 'before' }, rows)).toBeNull();
    expect(dropResult(folderB, { key: 'folder:a', position: 'after' }, rows)).toBeNull();
  });
});

describe('dropsIntoFolder', () => {
  it('starts the indicator at the folder’s text edge between children', () => {
    expect(dropsIntoFolder('item:document:a1', rows)).toBe(true);
    expect(dropsIntoFolder('item:document:loose', rows)).toBe(false);
    expect(dropsIntoFolder('folder:a', rows)).toBe(false);
  });
});
