import { Circle, FileText, Shapes } from 'lucide-react';
import type { ReactElement, RefObject } from 'react';
import type { Project } from '../../lib/types';
import { Menu, MenuItem, MenuList, MenuSection, MenuTrigger, PopoverSurface, useToast } from '../../ui';
import { useApp } from '../AppProvider';

type NewKind = 'document' | 'drawing' | 'task';

function useCreate(project: Project) {
  const app = useApp();
  const toast = useToast();
  return (kind: NewKind) => {
    if (project.archivedAt) return toast('Projeto arquivado: desarquive para criar itens.', 'error');
    if (kind === 'document') void app.newDocument(project.id);
    else if (kind === 'drawing') void app.newCanvas(project.id);
    else app.newTask(project.id);
  };
}

function NewItems({ project }: { project: Project }) {
  return (
    <MenuSection title={`Novo em ${project.name}`}>
      <MenuItem id="document" icon={<FileText size={16} />}>
        Documento
      </MenuItem>
      <MenuItem id="drawing" icon={<Shapes size={16} />}>
        Desenho
      </MenuItem>
      <MenuItem id="task" icon={<Circle size={16} />}>
        Tarefa
      </MenuItem>
    </MenuSection>
  );
}

/** "Novo em <projeto>": a document, a drawing or a task in the project; none in an archived one. */
export function NewItemMenu({ project, trigger }: { project: Project; trigger: ReactElement }) {
  const create = useCreate(project);
  return (
    <MenuTrigger>
      {trigger}
      <Menu aria-label={`Novo em ${project.name}`} onAction={(key) => create(key as NewKind)}>
        <NewItems project={project} />
      </Menu>
    </MenuTrigger>
  );
}

/** The same menu opened by N, anchored at the top of the page. */
export function NewItemPopover({
  project,
  triggerRef,
  isOpen,
  onOpenChange,
}: {
  project: Project;
  triggerRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreate(project);
  return (
    <PopoverSurface triggerRef={triggerRef} isOpen={isOpen} onOpenChange={onOpenChange} placement="bottom end">
      <MenuList
        aria-label={`Novo em ${project.name}`}
        autoFocus="first"
        onAction={(key) => {
          onOpenChange(false);
          create(key as NewKind);
        }}
      >
        <NewItems project={project} />
      </MenuList>
    </PopoverSurface>
  );
}
