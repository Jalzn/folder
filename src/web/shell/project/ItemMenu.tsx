import { Ellipsis } from 'lucide-react';
import type { ReactNode } from 'react';
import { useFolders, useProjects } from '../../lib/queries';
import type { ItemType } from '../../lib/types';
import { IconButton, Menu, MenuItem, MenuSeparator, MenuTrigger, ProjectMark, SubmenuTrigger } from '../../ui';
import { useShellActions } from '../shell-ui';
import { itemCommands } from './item-commands';
import { activeProjects } from './project-order';
import { useMoveItem } from './use-move-item';
import { usePins } from './use-pins';

export interface ItemMenuAction {
  id: string;
  label: string;
  icon?: ReactNode;
  action: () => void;
  disabled?: boolean;
  /** A note under the label, such as where "Criar tarefa" takes the task from. */
  description?: string;
  /** Keys of the action's shortcut, such as `['mod', 'alt', 'T']`. */
  shortcut?: readonly string[];
}

const labels: Record<ItemType, string> = { document: 'Opções do documento', drawing: 'Opções do desenho' };

/**
 * The ⋯ of an open document or drawing: its own actions first, then Fixar or Desafixar, "Mover para pasta…"
 * (M), which says where the item is, and "Mover para projeto…" (left out in an archived project), and Mover
 * para a lixeira last.
 */
export function ItemMenu({
  type,
  id,
  projectId,
  folderId,
  pinned,
  actions,
  onTrash,
}: {
  type: ItemType;
  id: string;
  projectId: string;
  folderId: string | null;
  pinned: boolean;
  actions: ItemMenuAction[];
  onTrash: () => void;
}) {
  const projects = useProjects(true).data ?? [];
  const archived = Boolean(projects.find((project) => project.id === projectId)?.archivedAt);
  const pins = usePins();
  const ui = useShellActions();
  const { move } = useMoveItem();
  const folder = useFolders(projectId).data?.find((each) => each.id === folderId);
  const label = labels[type];
  const commands = itemCommands(pinned);
  return (
    <MenuTrigger>
      <IconButton label={label}>
        <Ellipsis size={16} />
      </IconButton>
      <Menu
        key={archived ? 'archived' : 'active'}
        aria-label={label}
        disabledKeys={actions.filter((action) => action.disabled).map((action) => action.id)}
      >
        {actions.map((action) => (
          <MenuItem
            key={action.id}
            id={action.id}
            icon={action.icon}
            {...(action.description ? { description: action.description } : {})}
            {...(action.shortcut ? { shortcut: action.shortcut } : {})}
            onAction={action.action}
          >
            {action.label}
          </MenuItem>
        ))}
        <MenuSeparator />
        {!archived && (
          <MenuItem
            key="pin"
            id="pin"
            icon={commands.pin.icon}
            shortcut={commands.pin.shortcut}
            onAction={() => void (pinned ? pins.unpin(type, id) : pins.pin(type, id))}
          >
            {commands.pin.label}
          </MenuItem>
        )}
        {!archived && (
          <MenuItem
            key="move-folder"
            id="move-folder"
            icon={commands.folder.icon}
            shortcut={commands.folder.shortcut}
            description={folder ? `Em ${folder.name}` : 'Na raiz do projeto'}
            onAction={() => ui.setMoveOpen('folder')}
          >
            {commands.folder.label}
          </MenuItem>
        )}
        {!archived && (
          <SubmenuTrigger>
            <MenuItem key="move" id="move" icon={commands.project.icon}>
              {commands.project.label}
            </MenuItem>
            <Menu
              aria-label="Mover para projeto"
              placement="end top"
              selectionMode="single"
              selectedKeys={[projectId]}
              onAction={(key) => void move(type, id, projectId, String(key))}
            >
              {activeProjects(projects).map((project) => (
                <MenuItem
                  key={project.id}
                  id={project.id}
                  icon={<ProjectMark name={project.name} color={project.color} />}
                >
                  {project.name}
                </MenuItem>
              ))}
            </Menu>
          </SubmenuTrigger>
        )}
        {!archived && <MenuSeparator />}
        <MenuItem key="trash" id="trash" icon={commands.trash.icon} danger onAction={onTrash}>
          {commands.trash.label}
        </MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
