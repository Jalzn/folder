import { daysAgo } from '../../../lib/dates/dates';
import type { TrashItem } from '../../../lib/queries';

/** The trash's Tipo filter. */
export type TrashFilter = 'all' | TrashItem['type'];

export type TrashGroupLabel = 'Hoje' | 'Esta semana' | 'Mais antigos';

export interface TrashGroup<Item> {
  label: TrashGroupLabel;
  items: Item[];
}

/** The items the filter keeps, in the order given. */
export function filterTrash<Item extends { type: TrashItem['type'] }>(items: readonly Item[], filter: TrashFilter) {
  return filter === 'all' ? [...items] : items.filter((item) => item.type === filter);
}

const groupOf = (days: number): TrashGroupLabel => (days <= 0 ? 'Hoje' : days <= 6 ? 'Esta semana' : 'Mais antigos');

/**
 * Groups by the day each item was deleted, on this device's calendar: Hoje, Esta semana (the six days
 * before) and Mais antigos. Empty groups are left out, and each keeps the order given.
 */
export function groupTrash<Item extends { deletedAt: string }>(
  items: readonly Item[],
  now = new Date(),
): TrashGroup<Item>[] {
  const groups: TrashGroup<Item>[] = [
    { label: 'Hoje', items: [] },
    { label: 'Esta semana', items: [] },
    { label: 'Mais antigos', items: [] },
  ];
  for (const item of items) {
    const label = groupOf(daysAgo(item.deletedAt, now));
    groups.find((group) => group.label === label)?.items.push(item);
  }
  return groups.filter((group) => group.items.length);
}
