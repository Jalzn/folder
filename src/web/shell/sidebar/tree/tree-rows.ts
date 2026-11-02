import type { NavFolder, NavItem, NavTree } from '@tinyfold/workspace/domain';

/** An item the tree shows: a pin of the root, a folder's child or a loose item. */
export interface ItemNode {
  kind: 'item';
  key: string;
  item: NavItem;
  /** The last of the root's pins, which draws the line under them when something follows. */
  lastPin: boolean;
  current: boolean;
  pending: boolean;
}

export interface FolderNode {
  kind: 'folder';
  key: string;
  folder: NavFolder;
  expanded: boolean;
  /** The open item is inside: a closed folder says so. */
  holdsCurrent: boolean;
  /** Items inside with changes not yet saved. */
  pending: number;
  children: TreeNode[];
}

/** "Ver todos · n" of a folder, or "Ver todos na raiz · n". */
export interface MoreNode {
  kind: 'more';
  key: string;
  folderId: string | null;
  count: number;
}

/** "Pasta vazia · + Documento · + Desenho", in an open folder without items. */
export interface EmptyNode {
  kind: 'empty';
  key: string;
  folder: NavFolder;
}

export type TreeNode = ItemNode | FolderNode | MoreNode | EmptyNode;

/** An item with changes not yet saved, and the folder it is in, from the tree or from the open item. */
export interface PendingItem {
  type: NavItem['type'];
  id: string;
  folderId: string | null;
}

const itemKey = (item: Pick<NavItem, 'type' | 'id'>) => `item:${item.type}:${item.id}`;
export const folderKey = (id: string) => `folder:${id}`;

const same = (a: Pick<NavItem, 'type' | 'id'>, b: Pick<NavItem, 'type' | 'id'>) => a.type === b.type && a.id === b.id;

/**
 * The rows of the Itens tree (docs/interface/pastas.md §1): the root's pins, the folders in their order, each
 * with its pins first and up to the limit, and the loose items of the root. The open item always shows: past
 * the limit it comes as one more row, above "Ver todos", in its folder or at the root, but only when the tree
 * lists it nowhere. No key ever comes twice, even while the item's folder and the tree disagree for a moment
 * after a move: React Aria's collection cannot hold the same key in two places.
 */
export function treeRows(
  tree: NavTree,
  open: NavItem | null,
  expanded: ReadonlySet<string>,
  pending: readonly PendingItem[],
): TreeNode[] {
  const isPending = (item: NavItem) => pending.some((entry) => same(entry, item));
  const listed = [...tree.pinned, ...tree.loose.items, ...tree.folders.flatMap((folder) => folder.items)];
  const extraOpen = open !== null && !listed.some((item) => same(item, open)) ? open : null;
  const seen = new Set<string>();
  /** Each item once, where the tree lists it first. */
  const fresh = (item: NavItem) => {
    const key = itemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  const node = (item: NavItem, lastPin = false): ItemNode => ({
    kind: 'item',
    key: itemKey(item),
    item,
    lastPin,
    current: open !== null && same(open, item),
    pending: isPending(item),
  });
  const known = new Set(tree.folders.map((folder) => folder.id));
  const openFolder = open?.folderId && known.has(open.folderId) ? open.folderId : null;
  const pinnedItems = tree.pinned.filter(fresh);

  const folders = tree.folders.map((folder): FolderNode => {
    const items = folder.items.filter(fresh).map((item) => node(item));
    const extra = extraOpen && openFolder === folder.id ? [node(extraOpen)] : [];
    const children: TreeNode[] = [...items, ...extra];
    if (folder.total === 0) children.push({ kind: 'empty', key: `empty:${folder.id}`, folder });
    else if (folder.total > folder.items.length)
      children.push({ kind: 'more', key: `more:${folder.id}`, folderId: folder.id, count: folder.total });
    return {
      kind: 'folder',
      key: folderKey(folder.id),
      folder,
      expanded: expanded.has(folder.id),
      holdsCurrent: openFolder === folder.id,
      pending: pending.filter((entry) => entry.folderId === folder.id).length,
      children,
    };
  });

  const loose = tree.loose.items.filter(fresh).map((item) => node(item));
  if (extraOpen && openFolder === null) loose.push(node(extraOpen));
  const after = folders.length + loose.length;
  const pinned = pinnedItems.map((item, index) => node(item, after > 0 && index === pinnedItems.length - 1));
  const rows: TreeNode[] = [...pinned, ...folders, ...loose];
  if (tree.loose.total > tree.loose.items.length)
    rows.push({ kind: 'more', key: 'more:root', folderId: null, count: tree.pinned.length + tree.loose.total });
  return rows;
}

/** The folder rows that are open, for the tree's expanded keys. */
export const expandedKeys = (rows: readonly TreeNode[]) =>
  new Set(rows.flatMap((row) => (row.kind === 'folder' && row.expanded ? [row.key] : [])));
