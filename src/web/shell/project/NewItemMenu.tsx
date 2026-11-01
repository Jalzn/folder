import { Circle, FileText, Folder, Shapes } from 'lucide-react';
import type { ReactElement, RefObject } from 'react';
import type { ItemType, Project } from '../../lib/types';
import { Menu, MenuItem, MenuList, MenuSection, MenuTrigger, PopoverSurface, useToast } from '../../ui';
import { useApp } from '../AppProvider';
import { useShellActions } from '../shell-ui';
import { useTaskDrawer } from '../task-drawer-state';

/** What "Novo" creates: an item at the project's root or in a folder, a folder or a task. */
type NewKind = ItemType | 'folder' | 'task' | `here:${ItemType}`;

/** The folder a Novo menu creates in first, as the one in focus in the tree or the open item's. */
export interface NewItemFolder {
  id: string;
  name: string;
}

function useCreate(project: Project, folder: NewItemFolder | undefined) {
  const app = useApp();
  const drawer = useTaskDrawer();
  const ui = useShellActions();
  const toast = useToast();
  return (kind: NewKind) => {
    if (project.archivedAt) return toast('Projeto arquivado: desarquive para criar itens.', 'error');
    if (kind === 'here:document' && folder) void app.newDocument(project.id, folder.id);
    else if (kind === 'here:drawing' && folder) void app.newCanvas(project.id, folder.id);
    else if (kind === 'document') void app.newDocument(project.id);
    else if (kind === 'drawing') void app.newCanvas(project.id);
    else if (kind === 'folder') ui.startFolder({ projectId: project.id });
    else drawer.newTask(project.id);
  };
}

/** "Em MCP" (in a folder's context) and then "Novo em <projeto>": Documento, Desenho, Pasta and Tarefa. */
function NewItems({ project, folder }: { project: Project; folder: NewItemFolder | undefined }) {
  return (
    <>
      {folder && (
        <MenuSection title={`Em ${folder.name}`}>
          <MenuItem id="here:document" icon={<FileText size={16} />}>
            {`Novo documento em ${folder.name}`}
          </MenuItem>
          <MenuItem id="here:drawing" icon={<Shapes size={16} />}>
            {`Novo desenho em ${folder.name}`}
          </MenuItem>
        </MenuSection>
      )}
      <MenuSection title={`Novo em ${project.name}`}>
        <MenuItem id="document" icon={<FileText size={16} />}>
          Documento
        </MenuItem>
        <MenuItem id="drawing" icon={<Shapes size={16} />}>
          Desenho
        </MenuItem>
        <MenuItem id="folder" icon={<Folder size={16} />}>
          Pasta
        </MenuItem>
        <MenuItem id="task" icon={<Circle size={16} />}>
          Tarefa
        </MenuItem>
      </MenuSection>
    </>
  );
}

/** "Novo em <projeto>": a document, a drawing, a folder or a task in the project; none in an archived one. */
export function NewItemMenu({
  project,
  folder,
  trigger,
}: {
  project: Project;
  folder?: NewItemFolder | undefined;
  trigger: ReactElement;
}) {
  const create = useCreate(project, folder);
  return (
    <MenuTrigger>
      {trigger}
      <Menu aria-label={`Novo em ${project.name}`} onAction={(key) => create(key as NewKind)}>
        <NewItems project={project} folder={folder} />
      </Menu>
    </MenuTrigger>
  );
}

/** The same menu opened by N, anchored at the top of the page or at a row of the tree. */
export function NewItemPopover({
  project,
  folder,
  triggerRef,
  isOpen,
  onOpenChange,
  placement = 'bottom end',
}: {
  project: Project;
  folder?: NewItemFolder | undefined;
  triggerRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  placement?: 'bottom end' | 'bottom start';
}) {
  const create = useCreate(project, folder);
  return (
    <PopoverSurface
      triggerRef={triggerRef}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement={placement}
      aria-label={`Novo em ${folder ? folder.name : project.name}`}
    >
      <MenuList
        aria-label={`Novo em ${project.name}`}
        autoFocus="first"
        onAction={(key) => {
          onOpenChange(false);
          create(key as NewKind);
        }}
      >
        <NewItems project={project} folder={folder} />
      </MenuList>
    </PopoverSurface>
  );
}
