import { type KeyboardEvent, type RefObject, useRef } from 'react';
import { chordPending, forwardToShortcuts } from '../../keyboard/use-shortcuts';
import { FOLDER_NAME_FIELD } from './FolderNameField';
import { rowIn, rowOf } from './tree-dom';
import { rowKind, TYPEAHEAD_MS, treeKeyAction, typesAhead } from './tree-keys';
import type { ItemNode, TreeNode } from './tree-rows';
import type { TreeEditing } from './use-tree-editing';

const allNodes = (rows: readonly TreeNode[]) =>
  rows.flatMap((row) => (row.kind === 'folder' ? [row, ...row.children] : [row]));

/**
 * The tree's keys before React Aria's (tree-keys.ts says what each one does): the name field keeps its own,
 * shortcuts go to the app, F2, ⌥↑, ⌥↓, ⇧F10 and N to the folder actions, P and M to the item in focus, and →
 * on an open folder to its first child. A type-to-select search under way keeps its letters, and none of them
 * goes on past the tree.
 */
export function useTreeKeyRouter({
  tree,
  rows,
  editing,
  onLeaveUp,
  onPin,
  onMove,
}: {
  tree: RefObject<HTMLElement | null>;
  rows: readonly TreeNode[];
  editing: TreeEditing | undefined;
  onLeaveUp: (() => void) | undefined;
  onPin: (node: ItemNode) => void;
  /** M on an item, with the row that takes the focus if it leaves. */
  onMove: (node: ItemNode, neighbour: string | null) => void;
}) {
  // When the type-to-select last took a letter, so the next letters go on its search.
  const typedAt = useRef(Number.NEGATIVE_INFINITY);
  /**
   * After React Aria: a letter left to the type-to-select ends here, whether it found a row or not, so it
   * never reaches the page's shortcuts ("zp" would pin the open item, "an" open Novo). For the tree's
   * container, as `onKeyDown`.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return;
    if (event.target.closest(`[${FOLDER_NAME_FIELD}]`)) return;
    if (rowOf(event.target) && typesAhead(event)) event.stopPropagation();
  };
  const onKeyDownCapture = (event: KeyboardEvent<HTMLElement>) => {
    // Only the tree's own elements: the layers it opens, as "Mover para pasta…", render elsewhere in the page
    // but their keys still pass here through React, and keep them.
    if (!(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return;
    // A folder's name field owns its keys, composition included: only Enter and Esc go on to it past the
    // row, which would move the focus on an arrow, and the type-to-select, which would take a letter or a
    // space. Nothing here prevents the default, so the caret, the selection and the typing stay the field's.
    if (event.target.closest(`[${FOLDER_NAME_FIELD}]`)) {
      if (event.key !== 'Enter' && event.key !== 'Escape') event.stopPropagation();
      return;
    }
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const row = rowOf(event.target);
    const key = row?.dataset.key;
    const kind = key ? rowKind(key) : null;
    if (!row || !key || !kind) return;
    const action = treeKeyAction(event, kind, {
      first: tree.current?.querySelector('[role="row"]') === row,
      chordPending: chordPending(),
      inFolder: row.getAttribute('aria-level') === '2',
      editable: Boolean(editing?.editable),
      expanded: row.getAttribute('aria-expanded') === 'true',
      typing: event.timeStamp - typedAt.current < TYPEAHEAD_MS,
    });
    // A letter the type-to-select takes starts or goes on its search.
    if (!action && typesAhead(event)) typedAt.current = event.timeStamp;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    const node = allNodes(rows).find((each) => each.key === key);
    if (action === 'forward') forwardToShortcuts(event);
    else if (action === 'leave-up') onLeaveUp?.();
    else if (action === 'first-child') {
      const child = node?.kind === 'folder' ? node.children[0] : undefined;
      if (child) rowIn(tree.current, child.key)?.focus();
    } else if (action === 'pin' || action === 'move') {
      if (node?.kind !== 'item') return;
      if (action === 'pin') onPin(node);
      else {
        const all = [...(tree.current?.querySelectorAll<HTMLElement>('[role="row"]') ?? [])];
        const at = all.indexOf(row);
        onMove(node, (all[at + 1] ?? all[at - 1])?.dataset.key ?? null);
      }
    } else if (action !== 'swallow') editing?.folders.keyAction(action, node, key);
  };
  return { onKeyDownCapture, onKeyDown };
}
