import { toIsoInstant } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import { filterTrash, groupTrash } from './trash-groups';

const now = new Date(2026, 9, 31, 15, 0);
const item = (id: string, type: 'document' | 'drawing' | 'task', deletedAt: Date) => ({
  id,
  type,
  deletedAt: toIsoInstant(deletedAt),
});
const old = item('e', 'task', new Date(2026, 5, 1));
const items = [
  item('a', 'task', new Date(2026, 9, 31, 0, 10)),
  item('b', 'document', new Date(2026, 9, 30, 23, 50)),
  item('c', 'drawing', new Date(2026, 9, 25, 9, 0)),
  item('d', 'document', new Date(2026, 9, 24, 23, 59)),
  old,
];
const ids = (list: { id: string }[]) => list.map((entry) => entry.id);

describe('groupTrash', () => {
  it('splits by calendar day: today, the six days before, and older', () => {
    expect(groupTrash(items, now).map((group) => [group.label, ids(group.items)])).toEqual([
      ['Hoje', ['a']],
      ['Esta semana', ['b', 'c']],
      ['Mais antigos', ['d', 'e']],
    ]);
  });

  it('leaves out empty groups and keeps a clock running ahead in Hoje', () => {
    const ahead = item('f', 'drawing', new Date(2026, 10, 1, 8));
    expect(groupTrash([ahead, old], now).map((group) => group.label)).toEqual(['Hoje', 'Mais antigos']);
    expect(groupTrash([], now)).toEqual([]);
  });
});

describe('filterTrash', () => {
  it('keeps every item or only one type, in the same order', () => {
    expect(ids(filterTrash(items, 'all'))).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ids(filterTrash(items, 'document'))).toEqual(['b', 'd']);
    expect(ids(filterTrash(items, 'task'))).toEqual(['a', 'e']);
  });
});
