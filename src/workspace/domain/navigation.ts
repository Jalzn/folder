import { TASK_STATUSES, type TaskStatus } from './task-status.js';

/** The item types the sidebar lists in sections, which are also the ones that can be pinned. */
export const NAV_ITEM_TYPES = ['document', 'drawing'] as const;

export type NavItemType = (typeof NAV_ITEM_TYPES)[number];

/** How a sidebar section orders its items: last edited, A–Z, or last created first. */
export const NAV_SORTS = ['recent', 'title', 'created'] as const;

export type NavSort = (typeof NAV_SORTS)[number];

/** A document or drawing as the sidebar lists it. */
export interface NavItem {
  type: NavItemType;
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  pinnedAt: string | null;
  /** Null at the project's root. */
  folderId: string | null;
}

export interface NavSection {
  /** Every live item of the type in the project, pinned ones included. */
  total: number;
  /** In the order they were pinned. */
  pinned: NavItem[];
  /** The first unpinned items in the chosen order. */
  items: NavItem[];
}

const titles = new Intl.Collator('pt-BR');
const ascending = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const descending = (a: string, b: string) => ascending(b, a);

const orders: Record<NavSort, (a: NavItem, b: NavItem) => number> = {
  recent: (a, b) => descending(a.updatedAt, b.updatedAt),
  title: (a, b) => titles.compare(a.title, b.title),
  created: (a, b) => descending(a.createdAt, b.createdAt),
};

/** Pinned items in the order they were pinned, IDs breaking ties. */
export const byPinOrder = (a: NavItem, b: NavItem) =>
  ascending(a.pinnedAt ?? '', b.pinnedAt ?? '') || ascending(a.id, b.id);

/** Items in the chosen order, IDs breaking ties, so the order never changes between reads. */
export const bySort = (sort: NavSort) => (a: NavItem, b: NavItem) => orders[sort](a, b) || ascending(a.id, b.id);

/**
 * A sidebar section from all the live items of one type: the pinned ones first, then up to `limit`
 * of the others in `sort` order. IDs break ties, so the order never changes between reads.
 */
export function navSection(items: readonly NavItem[], sort: NavSort, limit: number): NavSection {
  const pinned = items.filter((item) => item.pinnedAt !== null).sort(byPinOrder);
  const unpinned = items.filter((item) => item.pinnedAt === null).sort(bySort(sort));
  return { total: items.length, pinned, items: unpinned.slice(0, limit) };
}

/** Columns of open tasks: every one but the last, where finished tasks go. */
const OPEN_STATUSES = TASK_STATUSES.filter((status) => status !== 'done');

export const openTaskCount = (counts: Record<TaskStatus, number>) =>
  OPEN_STATUSES.reduce((total, status) => total + counts[status], 0);

/** How many open tasks of each column a list leaves out, in board order, skipping columns with none. */
export function tasksLeftOut(counts: Record<TaskStatus, number>, listed: readonly { status: TaskStatus }[]) {
  return OPEN_STATUSES.map((status) => ({
    status,
    count: counts[status] - listed.filter((task) => task.status === status).length,
  })).filter((column) => column.count > 0);
}
