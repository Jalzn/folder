import type { TreeNode } from './tree-rows';

/** What is being dragged: an item, from the root or a folder, or a folder. */
export type DragSource =
  | { kind: 'item'; key: string; folderId: string | null }
  | { kind: 'folder'; key: string; id: string };

/** Where the pointer is: before, after or on a row. */
export interface DropSpot {
  key: string;
  position: 'before' | 'after' | 'on';
}

/** What a drop does: an item into a folder or the root, or a folder to another place among the folders. */
export type DropResult =
  | { kind: 'into'; folderId: string | null }
  | { kind: 'reorder'; folderId: string; beforeFolderId: string | null }
  | null;

interface Place {
  kind: TreeNode['kind'];
  /** The folder a child row is in; null at the root. */
  parent: string | null;
  folderId?: string;
}

function places(rows: readonly TreeNode[]) {
  const map = new Map<string, Place>();
  for (const row of rows) {
    if (row.kind === 'folder') {
      map.set(row.key, { kind: 'folder', parent: null, folderId: row.folder.id });
      for (const child of row.children) map.set(child.key, { kind: child.kind, parent: row.folder.id });
    } else map.set(row.key, { kind: row.kind, parent: null });
  }
  return map;
}

/**
 * The drop rules of the Itens tree (docs/etapas/09-pastas.md, "Arrastar"). An item goes into a folder when
 * dropped on its row or between its children, and to the root between the root's rows; never between folder
 * rows. A folder only goes between other folders, which reorders them. A drop that changes nothing, or that
 * the rules refuse, is null: no indicator and the "not allowed" cursor.
 */
export function dropResult(source: DragSource, spot: DropSpot, rows: readonly TreeNode[]): DropResult {
  const map = places(rows);
  const target = map.get(spot.key);
  if (!target || spot.key === source.key) return null;
  if (source.kind === 'item') {
    let folderId: string | null | undefined;
    if (target.kind === 'folder') folderId = spot.position === 'on' ? (target.folderId ?? null) : undefined;
    else if (target.parent !== null)
      folderId = spot.position !== 'on' || target.kind === 'empty' ? target.parent : undefined;
    else folderId = spot.position === 'on' ? undefined : null;
    if (folderId === undefined || folderId === source.folderId) return null;
    return { kind: 'into', folderId };
  }
  if (target.kind !== 'folder' || spot.position === 'on' || !target.folderId) return null;
  const order = rows.flatMap((row) => (row.kind === 'folder' ? [row.folder.id] : []));
  const at = order.indexOf(target.folderId);
  const before = spot.position === 'before' ? target.folderId : (order[at + 1] ?? null);
  // Before itself, or before the folder that already follows it, leaves the order as it is.
  const next = order[order.indexOf(source.id) + 1] ?? null;
  if (before === source.id || before === next) return null;
  return { kind: 'reorder', folderId: source.id, beforeFolderId: before };
}

/** An indicator between rows starts at the text edge of the level it drops into: x=76 in a folder, else 52. */
export const dropsIntoFolder = (key: string, rows: readonly TreeNode[]) => places(rows).get(key)?.parent != null;
