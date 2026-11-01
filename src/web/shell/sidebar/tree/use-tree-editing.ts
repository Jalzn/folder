import type { RefObject } from 'react';
import type { Project } from '../../../lib/types';
import { useMoveToFolder } from '../../folders/use-move-to-folder';
import { rowIn } from './tree-dom';
import type { TreeNode } from './tree-rows';
import type { useExpandedFolders } from './use-expanded-folders';
import { useTreeDnd } from './use-tree-dnd';
import { useTreeFolders } from './use-tree-folders';

/**
 * What only the sidebar's tree does: the folder actions (create, rename, reorder, the ⋯ menu and delete)
 * and dragging. The rail's popover only reads and never mounts it.
 */
export function useTreeEditing({
  project,
  rows,
  expanded,
  tree,
  onDraftCancel,
}: {
  project: Project;
  rows: TreeNode[];
  expanded: ReturnType<typeof useExpandedFolders>;
  tree: RefObject<HTMLElement | null>;
  /** A new folder given up: where the focus goes back. */
  onDraftCancel: () => void;
}) {
  const editable = !project.archivedAt;
  const folders = useTreeFolders({
    project,
    rows,
    expanded,
    enabled: editable,
    rowByKey: (key) => rowIn(tree.current, key),
    onDraftCancel,
  });
  const moveToFolder = useMoveToFolder();
  const dragAndDropHooks = useTreeDnd({
    projectId: project.id,
    tree,
    rows,
    expanded,
    enabled: editable && !folders.renaming && !folders.draft,
    onMoveItem: (item, folderId) => {
      const folder = folders.folders.find((each) => each.id === folderId) ?? null;
      void moveToFolder.move(item, folder).then((moved) => moved && folderId && expanded.expand(folderId));
    },
    onReorder: (folderId, beforeFolderId) => void folders.place(folderId, beforeFolderId),
  });
  return { editable, folders, dragAndDropHooks };
}

export type TreeEditing = ReturnType<typeof useTreeEditing>;
