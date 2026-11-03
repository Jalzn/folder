import { byPinOrder, bySort, type NavItem, type NavSort } from './navigation.js';
import { byPosition, compareCodeUnits } from './order.js';

/** An active folder of the sidebar's tree, with its first children. */
export interface NavFolder {
  id: string;
  name: string;
  position: number;
  version: number;
  /** Every live document and drawing in the folder. */
  total: number;
  /** The folder's pinned items, in pin order, then the others in the chosen order, `limit` in all. */
  items: NavItem[];
}

/** The project's documents and drawings as the sidebar's "Itens" tree shows them. */
export interface NavTree {
  /** Every live document and drawing of the project. */
  total: number;
  /** The root's pinned items, in pin order. */
  pinned: NavItem[];
  /** The active folders, in manual order. */
  folders: NavFolder[];
  /** The root's unpinned items: how many, and the first `limit` in the chosen order. */
  loose: { total: number; items: NavItem[] };
}

/**
 * The tree from every live item of the project and its active folders: the root's pinned items, the
 * folders in manual order with their pinned children first and up to `limit` children in all, then up
 * to `limit` of the root's other items. Pins never count against the root's `limit`. An item whose
 * folder is unknown is shown at the root, so it never goes missing.
 */
export function navTree(
  items: readonly NavItem[],
  folders: readonly { id: string; name: string; position: number; version: number }[],
  sort: NavSort,
  limit: number,
): NavTree {
  const known = new Set(folders.map((folder) => folder.id));
  const atRoot = items.filter((item) => item.folderId === null || !known.has(item.folderId));
  const loose = atRoot.filter((item) => item.pinnedAt === null).sort(bySort(sort));
  return {
    total: items.length,
    pinned: atRoot.filter((item) => item.pinnedAt !== null).sort(byPinOrder),
    folders: [...folders]
      .sort((a, b) => byPosition(a, b) || compareCodeUnits(a.id, b.id))
      .map((folder) => {
        const children = items.filter((item) => item.folderId === folder.id);
        const pinned = children.filter((item) => item.pinnedAt !== null).sort(byPinOrder);
        const others = children.filter((item) => item.pinnedAt === null).sort(bySort(sort));
        return { ...folder, total: children.length, items: [...pinned, ...others].slice(0, limit) };
      }),
    loose: { total: loose.length, items: loose.slice(0, limit) },
  };
}
