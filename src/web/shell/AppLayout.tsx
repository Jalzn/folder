import './layout.css';
import type { ReactNode } from 'react';
import { useLastLocation } from '../navigation/use-last-location';
import { useRouteFocus } from '../navigation/use-route-focus';
import { useApp } from './AppProvider';
import { DrawerRegion } from './DrawerRegion';
import { useShellLayers } from './keyboard/use-shell-layers';
import { useShortcutActions } from './keyboard/use-shortcut-actions';
import { useShortcuts } from './keyboard/use-shortcuts';
import { useCurrentProject } from './project/use-current-project';
import { ShellOverlays } from './ShellOverlays';
import { SidebarRegion } from './SidebarRegion';
import { useShellActions } from './shell-ui';
import { useSidebarMode } from './use-sidebar-mode';

/** Page and drawer keep their own scrolling regions; overlays share the shell's layer stack. */
export function AppLayout({ children }: { children: ReactNode }) {
  const app = useApp();
  const ui = useShellActions();
  const { project, projects } = useCurrentProject();
  useRouteFocus(ui.announce);
  useLastLocation(app.owner.installationId);
  const sidebar = useSidebarMode();
  const { mode, rail, switcherPlace, toggleSidebar, sidebarShown } = sidebar;
  useShellLayers();
  useShortcuts(useShortcutActions({ project, projects, switcherPlace, sidebarShown, toggleSidebar }));
  return (
    <div className="app-layout" data-mode={mode} data-rail={rail || undefined}>
      <SidebarRegion project={project} sidebar={sidebar} />
      <div className="app-layout__work">
        <main id="main-content" className="app-layout__main" data-region="page" tabIndex={-1}>
          {children}
        </main>
        <DrawerRegion narrow={mode === 'narrow'} />
      </div>
      <ShellOverlays project={project} switcherPlace={switcherPlace} toggleSidebar={toggleSidebar} />
    </div>
  );
}
