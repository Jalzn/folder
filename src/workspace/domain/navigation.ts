import type { FiledItemType } from './items.js';
import { compareCodeUnits } from './order.js';

/** The item types the sidebar's tree lists, which are also the ones that can be pinned and filed. */
export { FILED_ITEM_TYPES as NAV_ITEM_TYPES } from './items.js';

export type NavItemType = FiledItemType;

/** How the sidebar's tree orders unpinned items: last edited, A–Z, or last created first. */
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

const titles = new Intl.Collator('pt-BR');
const ascending = compareCodeUnits;
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
