import { Circle, FileText, Shapes } from 'lucide-react';
import type { ReactElement } from 'react';
import type { Project } from '../../lib/types';
import { Menu, MenuItem, MenuSection, MenuTrigger, useToast } from '../../ui';
import { useApp } from '../AppProvider';

/** "Novo em <projeto>": a document, a drawing or a task in the project; none in an archived one. */
export function NewItemMenu({ project, trigger }: { project: Project; trigger: ReactElement }) {
  const app = useApp();
  const toast = useToast();
  function create(kind: 'document' | 'drawing' | 'task') {
    if (project.archivedAt) {
      toast('Projeto arquivado: desarquive para criar itens.', 'error');
      return;
    }
    if (kind === 'document') void app.newDocument(project.id);
    else if (kind === 'drawing') void app.newCanvas(project.id);
    else app.newTask(project.id);
  }
  return (
    <MenuTrigger>
      {trigger}
      <Menu aria-label={`Novo em ${project.name}`} onAction={(key) => create(key as 'document' | 'drawing' | 'task')}>
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
      </Menu>
    </MenuTrigger>
  );
}
