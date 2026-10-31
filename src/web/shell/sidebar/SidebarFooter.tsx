import { Link, useLocation } from '@tanstack/react-router';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { useApp } from '../AppProvider';
import { YouMenu } from './YouMenu';

/** The avatar's initial, as the Você menu and the rail show it. */
export function Avatar() {
  const app = useApp();
  return (
    <span className="avatar-mark" aria-hidden="true">
      {app.owner.name.slice(0, 1).toLocaleUpperCase('pt-BR')}
    </span>
  );
}

/** Você, with its menu, and the project's trash with its count. */
export function SidebarFooter({ project, trashCount }: { project: Project | null; trashCount: number | undefined }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const trash = project ? paths.trash(project.id) : null;
  return (
    <footer className="sidebar-footer">
      <YouMenu
        trigger={
          <AriaButton className="sidebar-footer__you" aria-label="Você: perfil, tema e sair">
            <Avatar />
            <span>Você</span>
            <ChevronDown size={12} aria-hidden="true" />
          </AriaButton>
        }
      />
      {trash && (
        <Link
          to={trash}
          activeOptions={{ exact: true }}
          className="sidebar-footer__trash"
          aria-current={pathname === trash ? 'page' : undefined}
          aria-label={`Lixeira de ${project?.name}${trashCount ? `, ${trashCount} ${trashCount === 1 ? 'item' : 'itens'}` : ''}`}
          title="Lixeira"
        >
          <Trash2 size={16} />
          {trashCount ? <span className="sidebar-footer__count">{trashCount}</span> : null}
        </Link>
      )}
    </footer>
  );
}
