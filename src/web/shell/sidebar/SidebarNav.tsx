import { useLocation } from '@tanstack/react-router';
import { LayoutDashboard, SquareKanban } from 'lucide-react';
import { countOf, formatCount } from '../../lib/count';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { SidebarRow } from './SidebarRow';

/**
 * Visão geral and Quadro. Beside the board, "1 atrasada" in --late when tasks are late, or else the open tasks
 * in --text-3 (docs/interface/refino.md, critique 3).
 */
export function SidebarNav({
  project,
  openTasks,
  overdueTasks,
}: {
  project: Project;
  openTasks: number | undefined;
  overdueTasks: number | undefined;
}) {
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
        meta={
          overdueTasks ? (
            <span className="sidebar-row__late">{countOf(overdueTasks, 'atrasada', 'atrasadas')}</span>
          ) : openTasks ? (
            formatCount(openTasks)
          ) : undefined
        }
      />
    </>
  );
}
