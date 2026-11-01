import type { RefObject } from 'react';
import type { Project } from '../../../lib/types';
import { DeleteFolderDialog } from '../../folders/DeleteFolderDialog';
import { MoveMenus } from '../../folders/MoveMenus';
import { NewItemPopover } from '../../project/NewItemMenu';
import type { ItemNode } from './tree-rows';
import type { TreeEditing } from './use-tree-editing';

/** An item M is moving, with the row that takes the focus if it leaves the tree. */
export interface Moving {
  node: ItemNode;
  neighbour: string | null;
}

/**
 * What the tree opens over itself: "Mover para pasta…" for M, in both trees, and in the sidebar the delete
 * confirmation and the Novo menu of a folder.
 */
export function TreeOverlays({
  project,
  editing,
  moving,
  moveAnchor,
  newHereAnchor,
  onMoveClose,
  onMovedToFolder,
  onMovedToProject,
}: {
  project: Project;
  editing: TreeEditing | undefined;
  moving: Moving | null;
  moveAnchor: RefObject<HTMLElement | null>;
  newHereAnchor: RefObject<HTMLElement | null>;
  onMoveClose: (moving: Moving) => void;
  onMovedToFolder: (moving: Moving, folderId: string | null) => void;
  onMovedToProject: (moving: Moving) => void;
}) {
  const folders = editing?.folders;
  return (
    <>
      {folders && (
        <DeleteFolderDialog
          folder={folders.confirming?.folder ?? null}
          open={folders.confirming?.open ?? false}
          pending={folders.busy}
          onConfirm={() => void folders.confirmDelete()}
          onClose={folders.closeConfirm}
        />
      )}
      {folders?.newHere && (
        <NewItemPopover
          project={project}
          folder={folders.newHere.folder}
          triggerRef={newHereAnchor}
          isOpen
          placement="bottom start"
          onOpenChange={(isOpen) => !isOpen && folders.closeNewHere()}
        />
      )}
      {moving && (
        <MoveMenus
          item={{
            type: moving.node.item.type,
            id: moving.node.item.id,
            projectId: project.id,
            folderId: moving.node.item.folderId,
            pinned: moving.node.item.pinnedAt !== null,
          }}
          triggerRef={moveAnchor}
          onClose={() => onMoveClose(moving)}
          onMovedToFolder={(folderId) => onMovedToFolder(moving, folderId)}
          onMovedToProject={() => onMovedToProject(moving)}
        />
      )}
    </>
  );
}
