import { type RefObject, useRef } from 'react';
import { DropIndicator, type DropTarget, useDragAndDrop } from 'react-aria-components';
import { cx } from '../../../lib/cx';
import type { FolderMoveItem } from '../../folders/use-move-to-folder';
import { type DragSource, dropResult, dropSpotAt, dropsIntoFolder } from './tree-drop';
import type { TreeNode } from './tree-rows';
import type { useExpandedFolders } from './use-expanded-folders';

/** The drag types of the tree: an item, with where it is, or a folder. */
export const ITEM_DRAG = 'application/x-tinyfold-item';
const FOLDER_DRAG = 'application/x-tinyfold-folder';

const findRow = (rows: readonly TreeNode[], key: string) =>
  rows.flatMap((row) => (row.kind === 'folder' ? [row, ...row.children] : [row])).find((row) => row.key === key);

type DropTargetDelegate = NonNullable<Parameters<typeof useDragAndDrop>[0]['dropTargetDelegate']>;

/** How long a closed folder waits under a held item before it opens (decision 13). */
const OPEN_AFTER_MS = 800;

/**
 * The drop target under the pointer, by the plan's table and nothing else (tree-drop.ts `dropSpotAt`). React
 * Aria's own delegate tries another place on the same row when this one is refused, and its collection
 * falls back to the root: here a refused place is no target, so the cursor says "not allowed".
 */
function strictDelegate(
  tree: RefObject<HTMLElement | null>,
  dragging: () => DragSource['kind'] | null,
): DropTargetDelegate {
  return {
    getDropTargetFromPoint(_x, y, isValidDropTarget) {
      const element = tree.current;
      const kind = dragging();
      if (!element || !kind) return null;
      const rows = [...element.querySelectorAll<HTMLElement>('[role="row"][data-key]')].map((row) => {
        const rect = row.getBoundingClientRect();
        return { key: row.dataset.key ?? '', top: rect.top, height: rect.height };
      });
      const spot = dropSpotAt(rows, y + element.getBoundingClientRect().top, kind);
      const target: DropTarget | null =
        spot === 'root' ? { type: 'root' } : spot && { type: 'item', key: spot.key, dropPosition: spot.position };
      return target && isValidDropTarget(target) ? target : null;
    },
  };
}

/**
 * Dragging in the sidebar's tree (docs/etapas/09-pastas.md, "Arrastar"): items into folders and to the root,
 * folders among folders, by the rules of tree-drop.ts, with no other place tried. A closed folder opens after
 * 800 ms over it, counted from when the pointer came on it, however it moves there; Esc cancels. Off in the
 * rail's popover, in an archived project and while a folder is named.
 */
export function useTreeDnd({
  projectId,
  tree,
  rows,
  expanded,
  enabled,
  onMoveItem,
  onReorder,
}: {
  projectId: string;
  tree: RefObject<HTMLElement | null>;
  rows: TreeNode[];
  expanded: ReturnType<typeof useExpandedFolders>;
  enabled: boolean;
  onMoveItem: (item: FolderMoveItem, folderId: string | null) => void;
  onReorder: (folderId: string, beforeFolderId: string | null) => void;
}) {
  // What the pointer carries, from the start of a drag to its end.
  const dragging = useRef<DragSource | null>(null);
  // The closed folder the pointer is on, and its timer, which only a new target restarts.
  const opening = useRef<{ key: string; timer: number } | null>(null);
  const stopOpening = () => {
    if (opening.current) window.clearTimeout(opening.current.timer);
    opening.current = null;
  };
  const sourceOf = (keys: Set<unknown>): DragSource | null => {
    const key = String([...keys][0] ?? '');
    const row = findRow(rows, key);
    if (row?.kind === 'item') return { kind: 'item', key, folderId: row.item.folderId };
    if (row?.kind === 'folder') return { kind: 'folder', key, id: row.folder.id };
    return null;
  };
  const spotOf = (target: DropTarget) =>
    target.type === 'item' ? { key: String(target.key), position: target.dropPosition } : null;
  const resultOf = (target: DropTarget) => {
    const source = dragging.current;
    if (!source) return null;
    const spot = spotOf(target);
    // The empty part of the tree is the root.
    if (!spot)
      return source.kind === 'item' && source.folderId !== null ? ({ kind: 'into', folderId: null } as const) : null;
    return dropResult(source, spot, rows);
  };
  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: !enabled,
    getItems: (keys): Record<string, string>[] => {
      dragging.current = sourceOf(keys);
      const row = findRow(rows, String([...keys][0] ?? ''));
      if (row?.kind === 'item')
        return [
          {
            [ITEM_DRAG]: JSON.stringify({
              type: row.item.type,
              id: row.item.id,
              projectId,
              folderId: row.item.folderId,
              pinned: row.item.pinnedAt !== null,
            } satisfies FolderMoveItem),
            'text/plain': row.item.title,
          },
        ];
      if (row?.kind === 'folder') return [{ [FOLDER_DRAG]: row.folder.id, 'text/plain': row.folder.name }];
      return [];
    },
    acceptedDragTypes: [ITEM_DRAG, FOLDER_DRAG],
    dropTargetDelegate: strictDelegate(tree, () => dragging.current?.kind ?? null),
    getDropOperation: (target) => (resultOf(target) ? 'move' : 'cancel'),
    onDropEnter: (event) => {
      const target = event.target;
      const key = target.type === 'item' && target.dropPosition === 'on' ? String(target.key) : '';
      if (opening.current?.key === key) return;
      stopOpening();
      if (!key.startsWith('folder:')) return;
      const folderId = key.slice('folder:'.length);
      if (expanded.isExpanded(folderId)) return;
      opening.current = { key, timer: window.setTimeout(() => expanded.expand(folderId), OPEN_AFTER_MS) };
    },
    onDropExit: stopOpening,
    onDrop: (event) => {
      stopOpening();
      const result = resultOf(event.target);
      const dragged = dragging.current;
      if (!result || !dragged) return;
      if (result.kind === 'reorder') onReorder(result.folderId, result.beforeFolderId);
      else if (dragged.kind === 'item') {
        const row = findRow(rows, dragged.key);
        if (row?.kind !== 'item') return;
        onMoveItem(
          {
            type: row.item.type,
            id: row.item.id,
            projectId,
            folderId: row.item.folderId,
            pinned: row.item.pinnedAt !== null,
          },
          result.folderId,
        );
      }
    },
    onDragEnd: () => {
      dragging.current = null;
      stopOpening();
    },
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        className={cx(
          'tree-drop',
          target.type === 'item' && dropsIntoFolder(String(target.key), rows) && 'tree-drop--child',
        )}
      />
    ),
  });
  return dragAndDropHooks;
}
