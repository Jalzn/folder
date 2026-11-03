import { toIsoInstant } from '@tinyfold/core/domain';
import type { NavFolder, NavItem, NavTree } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { type FolderNode, treeRows } from './tree-rows';

const item = (id: string, folderId: string | null = null, pinned = false): NavItem => ({
  type: 'document',
  id,
  title: id,
  updatedAt: toIsoInstant(new Date('2026-10-31T10:00:00Z')),
  createdAt: toIsoInstant(new Date('2026-10-31T10:00:00Z')),
  pinnedAt: pinned ? toIsoInstant(new Date('2026-10-31T10:00:00Z')) : null,
  folderId,
});
const folder = (id: string, items: NavItem[], total = items.length): NavFolder => ({
  id,
  name: id.toUpperCase(),
  position: 0,
  version: 1,
  total,
  items,
});
const tree = (parts: Partial<NavTree> = {}): NavTree => ({
  total: 0,
  pinned: [],
  folders: [],
  loose: { total: 0, items: [] },
  ...parts,
});
const keys = (rows: { key: string }[]) => rows.map((row) => row.key);
const none = new Set<string>();

describe('treeRows', () => {
  it('puts the root pins first, then the folders and the loose items, with a line under the pins', () => {
    const rows = treeRows(
      tree({
        pinned: [item('p1', null, true), item('p2', null, true)],
        folders: [folder('f', [item('a', 'f')])],
        loose: { total: 1, items: [item('l')] },
      }),
      null,
      none,
      [],
    );
    expect(keys(rows)).toEqual(['item:document:p1', 'item:document:p2', 'folder:f', 'item:document:l']);
    expect(rows.map((row) => row.kind === 'item' && row.lastPin)).toEqual([false, true, false, false]);
    expect(treeRows(tree({ pinned: [item('p1', null, true)] }), null, none, [])[0]).toMatchObject({ lastPin: false });
  });

  it('lists a folder’s items, then "Ver todos" when it holds more', () => {
    const [shown] = treeRows(tree({ folders: [folder('f', [item('a', 'f'), item('b', 'f')], 12)] }), null, none, []);
    expect(keys((shown as FolderNode).children)).toEqual(['item:document:a', 'item:document:b', 'more:f']);
    expect((shown as FolderNode).children[2]).toMatchObject({ kind: 'more', folderId: 'f', count: 12 });
  });

  it('shows the open item past the limit as one more row, above "Ver todos", in its folder or at the root', () => {
    const open = item('z', 'f');
    const [inFolder] = treeRows(tree({ folders: [folder('f', [item('a', 'f')], 9)] }), open, new Set(['f']), []);
    expect(keys((inFolder as FolderNode).children)).toEqual(['item:document:a', 'item:document:z', 'more:f']);
    expect((inFolder as FolderNode).holdsCurrent).toBe(true);

    const atRoot = treeRows(tree({ loose: { total: 9, items: [item('l')] } }), item('z'), none, []);
    expect(keys(atRoot)).toEqual(['item:document:l', 'item:document:z', 'more:root']);
    expect(atRoot[1]).toMatchObject({ current: true });
  });

  it('counts the root pins in "Ver todos na raiz"', () => {
    const rows = treeRows(
      tree({ pinned: [item('p', null, true)], loose: { total: 10, items: [item('l')] } }),
      null,
      none,
      [],
    );
    expect(rows.at(-1)).toMatchObject({ kind: 'more', folderId: null, count: 11 });
  });

  it('does not repeat an open item that already shows, pinned or listed', () => {
    const pinned = item('p', null, true);
    expect(keys(treeRows(tree({ pinned: [pinned] }), pinned, none, []))).toEqual(['item:document:p']);
    const child = item('a', 'f');
    const [shown] = treeRows(tree({ folders: [folder('f', [child])] }), child, none, []);
    expect(keys((shown as FolderNode).children)).toEqual(['item:document:a']);
  });

  it('puts an open item of an unknown folder at the root', () => {
    expect(keys(treeRows(tree(), item('z', 'gone'), none, []))).toEqual(['item:document:z']);
  });

  it('gives an empty folder its "Pasta vazia" row', () => {
    const [shown] = treeRows(tree({ folders: [folder('f', [])] }), null, new Set(['f']), []);
    expect((shown as FolderNode).children).toEqual([expect.objectContaining({ kind: 'empty', key: 'empty:f' })]);
    expect((shown as FolderNode).expanded).toBe(true);
  });

  it('marks unsaved items and counts them on their folder, even past the limit', () => {
    const rows = treeRows(
      tree({ folders: [folder('f', [item('a', 'f')], 20)], loose: { total: 1, items: [item('l')] } }),
      null,
      none,
      [
        { type: 'document', id: 'a', folderId: 'f' },
        { type: 'document', id: 'far', folderId: 'f' },
        { type: 'document', id: 'l', folderId: null },
      ],
    );
    expect((rows[0] as FolderNode).pending).toBe(2);
    expect(rows[1]).toMatchObject({ pending: true });
  });

  it('never lists the open item twice while its folder and the tree disagree after a move', () => {
    const all = (rows: ReturnType<typeof treeRows>): string[] =>
      rows.flatMap((row) => [row.key, ...(row.kind === 'folder' ? all(row.children) : [])]);
    const inFolder = item('a', 'f');
    // The item says the root, the tree still has it in the folder: it stays where the tree lists it.
    const toRoot = treeRows(tree({ folders: [folder('f', [inFolder])] }), item('a', null), new Set(['f']), []);
    expect(all(toRoot)).toEqual(['folder:f', 'item:document:a']);
    // The item says a folder, the tree still has it at the root, pinned or loose.
    const fromRoot = treeRows(
      tree({ folders: [folder('f', [])], loose: { total: 1, items: [item('a')] } }),
      inFolder,
      new Set(['f']),
      [],
    );
    expect(all(fromRoot)).toEqual(['folder:f', 'empty:f', 'item:document:a']);
    const fromPins = treeRows(
      tree({ folders: [folder('f', [])], pinned: [item('a', null, true)] }),
      inFolder,
      none,
      [],
    );
    expect(all(fromPins)).toEqual(['item:document:a', 'folder:f', 'empty:f']);
    // Listed twice by the tree itself, it shows once, where it comes first.
    const twice = treeRows(
      tree({ pinned: [item('a', null, true)], loose: { total: 1, items: [item('a')] } }),
      null,
      none,
      [],
    );
    expect(all(twice)).toEqual(['item:document:a']);
  });
});
