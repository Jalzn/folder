import type { Project } from '../lib/types';
import { useShellActions } from './shell-ui';
import { CollapsedRail } from './sidebar/CollapsedRail';
import { ProjectSidebar } from './sidebar/ProjectSidebar';
import { TopBar } from './TopBar';
import type { SidebarMode } from './use-sidebar-mode';
export function SidebarRegion({ project, sidebar }: { project: Project | null; sidebar: SidebarMode }) {
  const { mode, rail, prefs } = sidebar;
  const ui = useShellActions();
  return (
    <>
      {mode === 'narrow' && <TopBar project={project} onMenu={() => ui.setOverlay(true)} />}
      {mode !== 'narrow' &&
        (rail ? (
          <CollapsedRail
            project={project}
            expandLabel={mode === 'wide' ? 'Expandir a barra lateral' : 'Abrir a barra lateral'}
            onExpand={() => (mode === 'wide' ? prefs.setCollapsed(false) : ui.setOverlay(true))}
          />
        ) : (
          <ProjectSidebar
            project={project}
            place="sidebar"
            collapseLabel="Recolher a barra lateral"
            onCollapse={() => prefs.setCollapsed(true)}
          />
        ))}
    </>
  );
}
