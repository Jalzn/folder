import { useNavigate } from '@tanstack/react-router';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Ellipsis, Pencil, Table2, Trash2 } from 'lucide-react';
import { useProjects } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { IconButton, Menu, MenuItem, MenuSeparator, MenuTrigger } from '../../ui';
import { useApp } from '../AppProvider';
import { moveTarget } from './project-order';
import { useProjectActions } from './use-project-actions';

/**
 * The ⋯ of the Visão geral: rename and colour, the switcher order, the Índice and the trash, and archive.
 * An archived project offers only Desarquivar and its trash.
 */
export function ProjectMenu({ project }: { project: Project }) {
  const app = useApp();
  const navigate = useNavigate();
  const projects = useProjects(true).data ?? [];
  const actions = useProjectActions();
  const go = (href: string) => void navigate({ href });
  const trash = (
    <MenuItem key="trash" id="trash" icon={<Trash2 size={16} />} onAction={() => go(paths.trash(project.id))}>
      Lixeira do projeto
    </MenuItem>
  );
  return (
    <MenuTrigger>
      <IconButton label="Opções do projeto">
        <Ellipsis size={16} />
      </IconButton>
      {project.archivedAt ? (
        // Distinct keys: archiving swaps the menu while it may still be closing, and items keep their ids.
        <Menu key="archived" aria-label="Opções do projeto">
          <MenuItem
            key="unarchive"
            id="unarchive"
            icon={<ArchiveRestore size={16} />}
            onAction={() => void actions.unarchive(project)}
          >
            Desarquivar
          </MenuItem>
          {trash}
        </Menu>
      ) : (
        <Menu
          key="active"
          aria-label="Opções do projeto"
          disabledKeys={[
            ...(moveTarget(projects, project.id, 'up') === undefined ? ['up'] : []),
            ...(moveTarget(projects, project.id, 'down') === undefined ? ['down'] : []),
          ]}
        >
          <MenuItem id="rename" icon={<Pencil size={16} />} onAction={() => app.openProjectDialog(project)}>
            Renomear e cor da marca…
          </MenuItem>
          <MenuItem id="up" icon={<ArrowUp size={16} />} onAction={() => void actions.move(project, projects, 'up')}>
            Subir no seletor
          </MenuItem>
          <MenuItem
            id="down"
            icon={<ArrowDown size={16} />}
            onAction={() => void actions.move(project, projects, 'down')}
          >
            Descer no seletor
          </MenuItem>
          <MenuSeparator />
          <MenuItem id="index" icon={<Table2 size={16} />} onAction={() => go(paths.index(project.id))}>
            Índice
          </MenuItem>
          {trash}
          <MenuSeparator />
          <MenuItem id="archive" icon={<Archive size={16} />} onAction={() => void actions.archive(project)}>
            Arquivar
          </MenuItem>
        </Menu>
      )}
    </MenuTrigger>
  );
}
