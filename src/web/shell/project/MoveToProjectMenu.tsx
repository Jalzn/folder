import type { RefObject } from 'react';
import { api, queryClient } from '../../lib/api';
import { useProjects } from '../../lib/queries';
import type { ItemType } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { MenuItem, MenuList, MenuSection, PopoverSurface, ProjectMark, useToast } from '../../ui';
import { moveItem } from './move-item';
import { activeProjects } from './project-order';

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
  const action = useAction();
  const toast = useToast();

  async function move(to: string) {
    if (to === projectId) return;
    const moved = await action.run(() => moveItem(type, id, to));
    if (!moved) return;
    void queryClient.invalidateQueries({ queryKey: ['workspace', type === 'document' ? 'document' : 'canvas', id] });
    const destination = projects.find((project) => project.id === to)?.name ?? 'outro projeto';
    toast(`“${moved.title}” foi para ${destination}.`, {
      action: {
        label: 'Desfazer',
        onAction: () =>
          void action.run(async () => {
            await moveItem(type, id, projectId);
            // The pin comes back while the project has room for it; a full project keeps the item unpinned.
            if (moved.pinned) await api.workspace.pinItem({ type, id }).catch(() => undefined);
          }),
      },
    });
  }
  return (
    <PopoverSurface triggerRef={triggerRef} isOpen={isOpen} onOpenChange={onOpenChange} placement="bottom start">
      <MenuList
        aria-label="Mover para projeto"
        selectionMode="single"
        selectedKeys={[projectId]}
        onAction={(key) => {
          onOpenChange(false);
          void move(String(key));
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
