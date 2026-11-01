import './sidebar.css';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, PanelLeftOpen, Search, SquareKanban, Trash2 } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';
import { countOf, formatCount } from '../../lib/count';
import { useProjects } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { IconButton, Logo, ProjectMark } from '../../ui';
import { ProjectSwitcher } from '../project/ProjectSwitcher';
import { switcherLabel } from '../project/switcher-label';
import { useShellActions } from '../shell-ui';
import { ItemsPopover } from './ItemsPopover';
import { Avatar } from './SidebarFooter';
import { useNavigationData } from './use-navigation-data';
import { YouMenu } from './YouMenu';

/** Whether the page is one of the project's items or its Índice, where the rail's Itens is the current place. */
const onItems = (pathname: string, projectId: string) => {
  const project = paths.overview(projectId);
  return (
    pathname.startsWith(`${project}/documentos/`) ||
    pathname.startsWith(`${project}/desenhos/`) ||
    pathname === `${project}/indice`
  );
};

/** The 52 px rail of a collapsed sidebar: the same places as 32 px buttons, and expand at the bottom. */
export function CollapsedRail({
  project,
  expandLabel,
  onExpand,
}: {
  project: Project | null;
  expandLabel: string;
  onExpand: () => void;
}) {
  const navigation = useNavigationData(project);
  const ui = useShellActions();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const go = (href: string) => void navigate({ href });
  const on = (href: string) => (pathname === href ? 'true' : undefined);
  const label = switcherLabel(project, useProjects(true).data ?? []);
  return (
    <div className="rail" data-region="sidebar">
      <ProjectSwitcher
        current={project}
        place="rail"
        placement="right top"
        trigger={
          <AriaButton className="btn btn-icon rail__button" data-variant="icon" aria-label={label.label}>
            {project ? <ProjectMark name={project.name} color={project.color} /> : <Logo compact />}
          </AriaButton>
        }
      />
      <IconButton
        label="Buscar"
        shortcut={['/']}
        className="rail__button"
        onPress={() => (project ? ui.setOverlay(true, { search: true }) : ui.openPalette())}
      >
        <Search size={16} />
      </IconButton>
      {project && (
        <>
          <IconButton
            label="Visão geral"
            className="rail__button"
            data-on={on(paths.overview(project.id))}
            onPress={() => go(paths.overview(project.id))}
          >
            <LayoutDashboard size={16} />
          </IconButton>
          <IconButton
            label={
              navigation?.overdueTasks
                ? `Quadro, ${countOf(navigation.overdueTasks, 'atrasada', 'atrasadas')}`
                : 'Quadro'
            }
            className="rail__button"
            data-on={on(paths.board(project.id))}
            onPress={() => go(paths.board(project.id))}
          >
            <SquareKanban size={16} />
          </IconButton>
          <span className="rail__gap" />
          <ItemsPopover project={project} tree={navigation?.tree} on={onItems(pathname, project.id)} />
        </>
      )}
      <span className="rail__grow" />
      <hr className="rail__rule" />
      {project && (
        <IconButton
          label={`Lixeira${navigation?.trashCount ? ` · ${formatCount(navigation.trashCount)}` : ''}`}
          className="rail__button"
          data-on={on(paths.trash(project.id))}
          onPress={() => go(paths.trash(project.id))}
        >
          <Trash2 size={16} />
        </IconButton>
      )}
      <YouMenu
        placement="right bottom"
        trigger={
          <AriaButton className="btn btn-icon rail__button" data-variant="icon" aria-label="Você: perfil, tema e sair">
            <Avatar />
          </AriaButton>
        }
      />
      <IconButton label={expandLabel} shortcut={['mod', '\\']} className="rail__button" onPress={onExpand}>
        <PanelLeftOpen size={16} />
      </IconButton>
    </div>
  );
}
