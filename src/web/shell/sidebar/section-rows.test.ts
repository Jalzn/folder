import type { NavItem } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { sectionRows, showsPinnedRule } from './section-rows';

const item = (id: string, pinnedAt: string | null = null): NavItem => ({
  id,
  title: `Item ${id}`,
  updatedAt: '2026-10-30T12:00:00.000Z',
  createdAt: '2026-10-30T12:00:00.000Z',
  pinnedAt,
});

describe('sectionRows', () => {
  it('lists the pinned items, then the others, and offers the Índice when some are left out', () => {
    const pinned = [item('p', '2026-10-31T09:00:00.000Z')];
    const items = Array.from({ length: 8 }, (_, index) => item(`i${index}`));
    expect(sectionRows({ total: 40, pinned, items }, null)).toEqual({ pinned, items, active: null, seeAll: 40 });
  });

  it('has no "Ver todos" when every item shows', () => {
    expect(sectionRows({ total: 2, pinned: [item('p', 'x')], items: [item('a')] }, null).seeAll).toBeNull();
  });

  it('always shows the open item, as one more row after the list', () => {
    const items = [item('a'), item('b')];
    const open = item('z');
    expect(sectionRows({ total: 12, pinned: [], items }, open).active).toEqual(open);
    expect(sectionRows({ total: 12, pinned: [], items }, item('b')).active).toBeNull();
    expect(sectionRows({ total: 12, pinned: [item('z', 'x')], items }, open).active).toBeNull();
  });

  it('draws the line under the pinned items only when other rows follow', () => {
    const pinned = [item('p', 'x')];
    expect(showsPinnedRule(sectionRows({ total: 2, pinned, items: [item('a')] }, null))).toBe(true);
    expect(showsPinnedRule(sectionRows({ total: 9, pinned, items: [] }, item('z')))).toBe(true);
    expect(showsPinnedRule(sectionRows({ total: 1, pinned, items: [] }, null))).toBe(false);
    expect(showsPinnedRule(sectionRows({ total: 1, pinned: [], items: [item('a')] }, null))).toBe(false);
  });
});
