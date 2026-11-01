/** What a key does on a row of the Itens tree, before React Aria's tree sees it. */
export type TreeKeyAction =
  /** A shortcut: N, G and the key after it, `/` and `?` go to the app's listener. */
  | 'forward'
  /** P on an item: pin or unpin it. */
  | 'pin'
  /** M on an item: move it. */
  | 'move'
  /** A key that does nothing here, kept from the tree, such as P or M on a folder, or → on an item. */
  | 'swallow'
  /** ↑ on the first row: back to the navigation above. */
  | 'leave-up'

  /** The tree's own: arrows, Enter, Space, Home, End and type-to-select. */
  | null;

/** The kind of a row, from its key: `item:…`, `folder:…`, `more:…` or `empty:…`. */
export type RowKind = 'item' | 'folder' | 'more' | 'empty';

export interface TreeKey {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

const forwarded = new Set(['n', 'g', '/', '?']);

/**
 * The keys the shortcuts win over the tree's type-to-select (docs/etapas/09-pastas.md, decision 12): N, G,
 * `/`, `?` and any key while a G chord waits go to the app's listener; P and M act on the item in focus and
 * do nothing on other rows. Other letters stay with type-to-select. → on an item stays put, instead of moving
 * into the link inside the row.
 */
export function treeKeyAction(
  press: TreeKey,
  row: RowKind,
  context: { first: boolean; chordPending: boolean },
): TreeKeyAction {
  if (press.ctrlKey || press.metaKey) return null;
  if (press.key === 'ArrowUp' && context.first && !press.altKey) return 'leave-up';
  if (press.key === 'ArrowRight' && (row === 'item' || row === 'more')) return 'swallow';
  if (press.altKey) return null;
  const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;
  if (context.chordPending && press.key.length === 1) return 'forward';
  if (forwarded.has(key)) return 'forward';
  if (key === 'p' || key === 'm') {
    if (row !== 'item') return 'swallow';
    if (press.shiftKey) return 'swallow';
    return key === 'p' ? 'pin' : 'move';
  }
  return null;
}

export function rowKind(rowKey: string): RowKind | null {
  const kind = rowKey.split(':', 1)[0];
  return kind === 'item' || kind === 'folder' || kind === 'more' || kind === 'empty' ? kind : null;
}
