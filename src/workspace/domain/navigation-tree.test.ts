import { describe, expect, it } from 'vitest';
import type { NavItem } from './navigation.js';
import { navTree } from './navigation-tree.js';

/** Created on October `created`, edited on October `edited`, in `folderId` or at the root. */
const item = (
  id: string,
  folderId: string | null,
  { created = 1, edited = 1, pinnedAt = null }: { created?: number; edited?: number; pinnedAt?: string | null } = {},
): NavItem => ({
  type: 'document',
  id,
  title: `Item ${id}`,
  createdAt: `2026-10-${String(created).padStart(2, '0')}T12:00:00.000Z`,
  updatedAt: `2026-10-${String(edited).padStart(2, '0')}T12:00:00.000Z`,
  pinnedAt,
  folderId,
});
const folder = (id: string, position: number) => ({ id, name: `Pasta ${id}`, position, version: 1 });
const ids = (items: readonly NavItem[]) => items.map((each) => each.id);

describe('navigation tree', () => {
  it('gives the root its pins in pin order, the folders in position order and the loose items by the sort', () => {
    const tree = navTree(
      [
        item('r1', null, { edited: 3 }),
        item('r2', null, { edited: 5 }),
        item('p2', null, { pinnedAt: '2026-10-20T00:00:00.000Z' }),
        item('p1', null, { pinnedAt: '2026-10-10T00:00:00.000Z' }),
        item('a1', 'a'),
      ],
      [folder('b', 1), folder('a', 0)],
      'recent',
      8,
    );
    expect(tree.total).toBe(5);
    expect(ids(tree.pinned)).toEqual(['p1', 'p2']);
    expect(tree.folders.map((each) => [each.id, each.total, ids(each.items)])).toEqual([
      ['a', 1, ['a1']],
      ['b', 0, []],
    ]);
    expect(tree.loose).toEqual({
      total: 2,
      items: [expect.objectContaining({ id: 'r2' }), expect.objectContaining({ id: 'r1' })],
    });
  });

  it('puts a folder’s pins first and keeps `limit` children in all, and `limit` loose items', () => {
    const children = Array.from({ length: 10 }, (_, index) => item(`c${index}`, 'a', { edited: index + 1 }));
    const pins = [
      item('pa', 'a', { pinnedAt: '2026-10-02T00:00:00.000Z' }),
      item('pb', 'a', { pinnedAt: '2026-10-01T00:00:00.000Z' }),
    ];
    const loose = Array.from({ length: 10 }, (_, index) => item(`r${index}`, null, { edited: index + 1 }));
    const tree = navTree([...children, ...pins, ...loose], [folder('a', 0)], 'recent', 3);
    expect(tree.folders[0]?.total).toBe(12);
    expect(ids(tree.folders[0]?.items ?? [])).toEqual(['pb', 'pa', 'c9']);
    expect(tree.loose.total).toBe(10);
    expect(ids(tree.loose.items)).toEqual(['r9', 'r8', 'r7']);
  });

  it('orders by A–Z and by creation, IDs breaking ties', () => {
    const items = [
      { ...item('x2', null, { created: 2 }), title: 'Beta' },
      { ...item('x1', null, { created: 2 }), title: 'Alfa' },
      { ...item('x3', null, { created: 9 }), title: 'Alfa' },
    ];
    expect(ids(navTree(items, [], 'title', 8).loose.items)).toEqual(['x1', 'x3', 'x2']);
    expect(ids(navTree(items, [], 'created', 8).loose.items)).toEqual(['x3', 'x1', 'x2']);
  });

  it('shows at the root an item whose folder it does not know, and an empty project as empty', () => {
    expect(ids(navTree([item('lost', 'gone')], [], 'recent', 8).loose.items)).toEqual(['lost']);
    expect(navTree([], [], 'recent', 8)).toEqual({ total: 0, pinned: [], folders: [], loose: { total: 0, items: [] } });
  });
});
