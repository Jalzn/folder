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
  /** N on a folder or inside one: the Novo menu with "Em <pasta>" first, at the row. */
  | 'new-here'
  /** F2 on a folder. */
  | 'rename'
  /** ⌥↑ and ⌥↓ on a folder. */
  | 'move-up'
  | 'move-down'
  /** ⇧F10 or the Menu key on a folder: its ⋯. */
  | 'menu'
  /** → on an open folder: its first child row, not the buttons inside the folder's row. */
  | 'first-child'
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

/** How long a type-to-select search goes on after its last letter, as React Aria's own. */
export const TYPEAHEAD_MS = 1000;

/** Whether a key goes on a type-to-select search: one printable letter or digit, no ⌘, Ctrl or ⌥. */
export const typesAhead = (press: TreeKey) =>
  press.key.length === 1 && press.key !== ' ' && !press.ctrlKey && !press.metaKey && !press.altKey;

/**
 * The keys the shortcuts win over the tree's type-to-select (docs/etapas/09-pastas.md, decision 12): N, G,
 * `/`, `?` and any key while a G chord waits go to the app's listener, except N on a folder or inside one,
 * which opens the Novo menu there; P and M act on the item in focus and do nothing on other rows. A search
 * already being typed (`typing`, a letter less than a second ago) keeps every letter, N, P, M and G
 * included, so "Opções" reaches its row instead of pinning the first one. F2, ⌥↑, ⌥↓ and ⇧F10 act on a
 * folder, in a project that is not archived (`editable`). → on an item stays put, instead of moving into the
 * link inside the row; on an open folder it goes to the first child.
 */
export function treeKeyAction(
  press: TreeKey,
  row: RowKind,
  context: {
    first: boolean;
    chordPending: boolean;
    inFolder: boolean;
    editable: boolean;
    /** The folder in focus is open. */
    expanded?: boolean;
    /** A type-to-select search is under way. */
    typing?: boolean;
  },
): TreeKeyAction {
  if (press.ctrlKey || press.metaKey) return null;
  if (row === 'folder' && context.editable) {
    if (press.altKey && press.key === 'ArrowUp') return 'move-up';
    if (press.altKey && press.key === 'ArrowDown') return 'move-down';
    if (!press.altKey && press.key === 'F2') return 'rename';
    if ((press.shiftKey && press.key === 'F10') || press.key === 'ContextMenu') return 'menu';
  }
  if (press.key === 'ArrowUp' && context.first && !press.altKey) return 'leave-up';
  if (press.key === 'ArrowRight' && (row === 'item' || row === 'more')) return 'swallow';
  if (press.key === 'ArrowRight' && row === 'folder' && context.expanded && !press.altKey && !press.shiftKey)
    return 'first-child';
  if (press.altKey) return null;
  const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;
  if (context.chordPending && press.key.length === 1) return 'forward';
  if (context.typing && typesAhead(press)) return null;
  if (key === 'n' && !press.shiftKey && (row === 'folder' || context.inFolder) && context.editable) return 'new-here';
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
