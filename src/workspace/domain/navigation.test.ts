import { describe, expect, it } from 'vitest';
import { type NavItem, navSection, openTaskCount, tasksLeftOut } from './navigation.js';

/** Created on October `created` and edited on October `edited`. */
const item = (id: string, title: string, created: number, edited: number, pinnedAt: string | null = null): NavItem => ({
  type: 'document',
  folderId: null,
  id,
  title,
  createdAt: `2026-10-${String(created).padStart(2, '0')}T12:00:00.000Z`,
  updatedAt: `2026-10-${String(edited).padStart(2, '0')}T12:00:00.000Z`,
  pinnedAt,
});

describe('sidebar sections', () => {
  const items = [
    item('a', 'Árvore de decisão', 1, 11),
    item('b', 'arquitetura', 2, 17),
    item('c', 'Zebra', 3, 18, '2026-10-20T08:00:00.000Z'),
    item('d', 'Doc 10', 4, 15),
    item('e', 'Doc 2', 5, 19, '2026-10-19T08:00:00.000Z'),
    item('f', 'Banco', 6, 12),
  ];
  const ids = (section: { items: NavItem[] }) => section.items.map((entry) => entry.id);

  it('puts pinned items first, in the order they were pinned, and counts every item', () => {
    const section = navSection(items, 'recent', 8);
    expect(section.total).toBe(6);
    expect(section.pinned.map((entry) => entry.id)).toEqual(['e', 'c']);
    expect(ids(section)).not.toContain('c');
  });

  it('orders the rest by last edit, by title in Portuguese or by creation, newest first', () => {
    expect(ids(navSection(items, 'recent', 8))).toEqual(['b', 'd', 'f', 'a']);
    expect(ids(navSection(items, 'title', 8))).toEqual(['b', 'a', 'f', 'd']);
    expect(ids(navSection(items, 'created', 8))).toEqual(['f', 'd', 'b', 'a']);
  });

  it('shows at most `limit` unpinned items and breaks ties by ID', () => {
    expect(ids(navSection(items, 'title', 2))).toEqual(['b', 'a']);
    const twins = [item('y', 'Igual', 1, 1), item('x', 'Igual', 1, 1)];
    expect(ids(navSection(twins, 'title', 8))).toEqual(['x', 'y']);
    expect(navSection([], 'recent', 8)).toEqual({ total: 0, pinned: [], items: [] });
  });
});

describe('overview counts', () => {
  const counts = { todo: 4, doing: 8, done: 9 };

  it('counts open tasks outside the done column', () => {
    expect(openTaskCount(counts)).toBe(12);
  });

  it('counts the open tasks a list leaves out, per column in board order', () => {
    const listed = Array.from({ length: 6 }, () => ({ status: 'doing' as const }));
    expect(tasksLeftOut(counts, listed)).toEqual([
      { status: 'todo', count: 4 },
      { status: 'doing', count: 2 },
    ]);
    expect(tasksLeftOut({ todo: 0, doing: 1, done: 3 }, [{ status: 'doing' }])).toEqual([]);
  });
});
