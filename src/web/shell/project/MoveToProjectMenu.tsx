import type { RefObject } from 'react';
import { useProjects } from '../../lib/queries';
import type { ItemType } from '../../lib/types';
import { MenuItem, MenuList, MenuSection, PopoverSurface, ProjectMark } from '../../ui';
import { activeProjects } from './project-order';
import { useMoveItem } from './use-move-item';

/**
 * "Mover para projeto…": the active projects, the item's own checked. Moving clears its pin; the toast's
 * "Desfazer" moves it back and pins it again when the project still has room.
 */
export function MoveToProjectMenu({
  type,
  id,
  projectId,
  triggerRef,
  isOpen,
  onOpenChange,
}: {
  type: ItemType;
  id: string;
  projectId: string;
  triggerRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const projects = activeProjects(useProjects(true).data ?? []);
  const { move } = useMoveItem();
  return (
    <PopoverSurface triggerRef={triggerRef} isOpen={isOpen} onOpenChange={onOpenChange} placement="bottom start">
      <MenuList
        aria-label="Mover para projeto"
        selectionMode="single"
        selectedKeys={[projectId]}
        onAction={(key) => {
          onOpenChange(false);
          void move(type, id, projectId, String(key));
        }}
      >
        <MenuSection title="Mover para projeto">
          {projects.map((project) => (
            <MenuItem key={project.id} id={project.id} icon={<ProjectMark name={project.name} color={project.color} />}>
              {project.name}
            </MenuItem>
          ))}
        </MenuSection>
      </MenuList>
    </PopoverSurface>
  );
}
