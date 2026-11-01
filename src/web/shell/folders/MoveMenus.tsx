import { type RefObject, useState } from 'react';
import { MoveToProjectMenu } from '../project/MoveToProjectMenu';
import { MoveToFolderPopover } from './MoveToFolderPopover';
import type { FolderMoveItem } from './use-move-to-folder';

/**
 * M's menus at one anchor: "Mover para pasta…" first, whose "Outro projeto…" opens "Mover para projeto…" in
 * the same place. `start` opens straight at the projects, as ⌘K's "Mover para projeto…".
 */
export function MoveMenus({
  item,
  triggerRef,
  start = 'folder',
  onClose,
  onMovedToFolder,
  onMovedToProject,
}: {
  item: FolderMoveItem;
  triggerRef: RefObject<HTMLElement | null>;
  start?: 'folder' | 'project';
  onClose: () => void;
  onMovedToFolder?: (folderId: string | null) => void;
  onMovedToProject?: () => void;
}) {
  const [stage, setStage] = useState(start);
  if (stage === 'project')
    return (
      <MoveToProjectMenu
        type={item.type}
        id={item.id}
        projectId={item.projectId}
        triggerRef={triggerRef}
        isOpen
        onOpenChange={(open) => !open && onClose()}
        {...(onMovedToProject ? { onMoved: onMovedToProject } : {})}
      />
    );
  return (
    <MoveToFolderPopover
      item={item}
      triggerRef={triggerRef}
      isOpen
      onOpenChange={(open) => !open && stage === 'folder' && onClose()}
      onOtherProject={() => setStage('project')}
      {...(onMovedToFolder ? { onMoved: onMovedToFolder } : {})}
    />
  );
}
