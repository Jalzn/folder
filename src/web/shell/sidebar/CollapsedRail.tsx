import './sidebar.css';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, PanelLeftOpen, SquareKanban, Trash2 } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { IconButton, Logo, ProjectMark } from '../../ui';
import { ProjectSwitcher } from '../project/ProjectSwitcher';
import { RailPopover } from './RailPopover';
import { Avatar } from './SidebarFooter';
import { useNavigationData } from './use-navigation-data';
import { YouMenu } from './YouMenu';

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
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const go = (href: string) => void navigate({ href });
  const on = (href: string) => (pathname === href ? 'true' : undefined);
  return (
    <div className="rail">
      <ProjectSwitcher
        current={project}
        placement="right top"
        trigger={
          <AriaButton
            className="btn btn-icon rail__button"
            data-variant="icon"
            aria-label={
              project ? `Projeto ${project.name}. Trocar de projeto` : 'Nenhum projeto ativo. Abrir o seletor'
            }
          >
            {project ? <ProjectMark name={project.name} color={project.color} /> : <Logo compact />}
          </AriaButton>
        }
      />
      {project && (
        <>
          <span className="rail__gap" />
          <IconButton
            label="Visão geral"
            className="rail__button"
            data-on={on(paths.overview(project.id))}
            onPress={() => go(paths.overview(project.id))}
          >
            <LayoutDashboard size={16} />
          </IconButton>
          <IconButton
            label="Quadro"
            className="rail__button"
            data-on={on(paths.board(project.id))}
            onPress={() => go(paths.board(project.id))}
          >
            <SquareKanban size={16} />
          </IconButton>
          <span className="rail__gap" />
          <RailPopover project={project} kind="documents" section={navigation?.documents} />
          <RailPopover project={project} kind="drawings" section={navigation?.drawings} />
        </>
      )}
      <span className="rail__grow" />
      <hr className="rail__rule" />
      {project && (
        <IconButton
          label={`Lixeira${navigation?.trashCount ? ` · ${navigation.trashCount}` : ''}`}
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
