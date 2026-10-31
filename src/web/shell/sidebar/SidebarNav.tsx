import { useLocation } from '@tanstack/react-router';
import { LayoutDashboard, SquareKanban } from 'lucide-react';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { SidebarRow } from './SidebarRow';

/** Visão geral and Quadro, with the open tasks beside the board. */
export function SidebarNav({ project, openTasks }: { project: Project; openTasks: number | undefined }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const overview = paths.overview(project.id);
  const board = paths.board(project.id);
  return (
    <>
      <SidebarRow
        href={overview}
        icon={<LayoutDashboard size={16} />}
        label="Visão geral"
        current={pathname === overview}
      />
      <SidebarRow
        href={board}
        icon={<SquareKanban size={16} />}
        label="Quadro"
        current={pathname === board}
        meta={openTasks || undefined}
      />
    </>
  );
}
