import { useRef } from 'react';
import { DropIndicator, type DropTarget, useDragAndDrop } from 'react-aria-components';
import { cx } from '../../../lib/cx';
import type { FolderMoveItem } from '../../folders/use-move-to-folder';
import { type DragSource, dropResult, dropsIntoFolder } from './tree-drop';
import type { TreeNode } from './tree-rows';
import type { useExpandedFolders } from './use-expanded-folders';

/** The drag types of the tree: an item, with where it is, or a folder. */
export const ITEM_DRAG = 'application/x-tinyfold-item';
export const FOLDER_DRAG = 'application/x-tinyfold-folder';

const findRow = (rows: readonly TreeNode[], key: string) =>
  rows.flatMap((row) => (row.kind === 'folder' ? [row, ...row.children] : [row])).find((row) => row.key === key);

/**
 * Dragging in the sidebar's tree (docs/etapas/09-pastas.md, "Arrastar"): items into folders and to the root,
 * folders among folders, by the rules of tree-drop.ts. A closed folder opens after React Aria's 800 ms over
 * it; Esc cancels. Off in the rail's popover, in an archived project and while a folder is named.
 */
export function useTreeDnd({
  projectId,
  rows,
  expanded,
  enabled,
  onMoveItem,
  onReorder,
}: {
  projectId: string;
  rows: TreeNode[];
  expanded: ReturnType<typeof useExpandedFolders>;
  enabled: boolean;
  onMoveItem: (item: FolderMoveItem, folderId: string | null) => void;
  onReorder: (folderId: string, beforeFolderId: string | null) => void;
}) {
  // What the pointer carries, from the start of a drag to its end.
  const dragging = useRef<DragSource | null>(null);
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
    getDropOperation: (target) => (resultOf(target) ? 'move' : 'cancel'),
    onDropActivate: (event) => {
      const key = event.target.type === 'item' ? String(event.target.key) : '';
      if (key.startsWith('folder:')) expanded.expand(key.slice('folder:'.length));
    },
    onDrop: (event) => {
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
