import type { IsoInstant } from '@tinyfold/core/domain';
import { readIsoInstant } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import { byPinOrder, bySort, type NavItem } from './navigation.js';

/** Created on October `created` and edited on October `edited`. */
const item = (
  id: string,
  title: string,
  created: number,
  edited: number,
  pinnedAt: IsoInstant | null = null,
): NavItem => ({
  type: 'document',
  folderId: null,
  id,
  title,
  createdAt: readIsoInstant(`2026-10-${String(created).padStart(2, '0')}T12:00:00.000Z`),
  updatedAt: readIsoInstant(`2026-10-${String(edited).padStart(2, '0')}T12:00:00.000Z`),
  pinnedAt,
});

describe('sidebar order', () => {
  const items = [
    item('a', 'Árvore de decisão', 1, 11),
    item('b', 'arquitetura', 2, 17),
    item('d', 'Doc 10', 4, 15),
    item('f', 'Banco', 6, 12),
  ];
  const ids = (sorted: readonly NavItem[]) => sorted.map((entry) => entry.id);

  it('orders pinned items in the order they were pinned', () => {
    const pinned = [
      item('c', 'Zebra', 3, 18, readIsoInstant('2026-10-20T08:00:00.000Z')),
      item('e', 'Doc 2', 5, 19, readIsoInstant('2026-10-19T08:00:00.000Z')),
    ];
    expect(ids([...pinned].sort(byPinOrder))).toEqual(['e', 'c']);
  });

  it('orders the rest by last edit, by title in Portuguese or by creation, newest first', () => {
    expect(ids([...items].sort(bySort('recent')))).toEqual(['b', 'd', 'f', 'a']);
    expect(ids([...items].sort(bySort('title')))).toEqual(['b', 'a', 'f', 'd']);
    expect(ids([...items].sort(bySort('created')))).toEqual(['f', 'd', 'b', 'a']);
  });

  it('breaks ties by ID, so the order never changes between reads', () => {
    const twins = [item('y', 'Igual', 1, 1), item('x', 'Igual', 1, 1)];
    for (const sort of ['recent', 'title', 'created'] as const)
      expect(ids([...twins].sort(bySort(sort)))).toEqual(['x', 'y']);
    const pins = [
      item('y', 'Y', 1, 1, readIsoInstant('2026-10-01T00:00:00.000Z')),
      item('x', 'X', 1, 1, readIsoInstant('2026-10-01T00:00:00.000Z')),
    ];
    expect(ids([...pins].sort(byPinOrder))).toEqual(['x', 'y']);
  });
});
