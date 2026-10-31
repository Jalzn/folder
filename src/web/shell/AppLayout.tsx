import './layout.css';
import { useLocation } from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { Dialog as AriaDialog, Modal, ModalOverlay } from 'react-aria-components';
import { parseProjectPath } from '../router/paths';
import { useLastLocation } from '../router/use-last-location';
import { useRouteFocus } from '../router/use-route-focus';
import { useApp } from './AppProvider';
import { CommandPalette } from './command-palette/CommandPalette';
import { ShortcutsDialog } from './keyboard/ShortcutsDialog';
import { useShortcutActions } from './keyboard/use-shortcut-actions';
import { useShortcuts } from './keyboard/use-shortcuts';
import { MoveToProjectMenu } from './project/MoveToProjectMenu';
import { NewItemPopover } from './project/NewItemMenu';
import { useCurrentProject } from './project/use-current-project';
import { type SwitcherPlace, useShellUi } from './shell-ui';
import { CollapsedRail } from './sidebar/CollapsedRail';
import { ProjectSidebar } from './sidebar/ProjectSidebar';
import { useSidebarPrefs } from './sidebar/use-sidebar-prefs';
import { TopBar } from './TopBar';
import { useLayoutMode } from './use-layout-mode';

/**
 * The shell's regions: the sidebar, fixed or as a rail, and the page (`main`, scrolling on its own). Below
 * 1100 px the full sidebar opens over the page, on a scrim, and closes when the page changes. The keyboard
 * model, the palette and the shortcuts dialog live here.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const app = useApp();
  const ui = useShellUi();
  const mode = useLayoutMode();
  const prefs = useSidebarPrefs();
  const { project, projects } = useCurrentProject();
  const pathname = useLocation({ select: (location) => location.pathname });
  const anchor = useRef<HTMLSpanElement>(null);
  const routeAnnouncement = useRouteFocus();
  useLastLocation(app.owner.installationId);
  const { setOverlay } = ui;
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new page closes the overlay.
  useEffect(() => setOverlay(false), [pathname, setOverlay]);
  useEffect(() => {
    if (mode === 'wide') setOverlay(false);
  }, [mode, setOverlay]);

  const rail = mode === 'medium' || (mode === 'wide' && prefs.collapsed);
  const switcherPlace: SwitcherPlace = ui.overlay.open
    ? 'overlay'
    : mode === 'narrow'
      ? 'top-bar'
      : rail
        ? 'rail'
        : 'sidebar';
  function toggleSidebar() {
    if (ui.overlay.open) ui.setOverlay(false);
    else if (mode === 'wide') prefs.setCollapsed(!prefs.collapsed);
    else ui.setOverlay(true);
  }
  useShortcuts(
    useShortcutActions({ project, projects, switcherPlace, sidebarShown: !rail && mode !== 'narrow', toggleSidebar }),
  );
  const item = parseProjectPath(pathname)?.item;

  return (
    <div className="app-layout" data-mode={mode} data-rail={rail || undefined}>
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
      <main id="main-content" className="app-layout__main" data-region="page" tabIndex={-1}>
        {children}
        <p className="sr-only" aria-live="polite">
          {ui.announcement || routeAnnouncement}
        </p>
      </main>
      <span ref={anchor} className="app-layout__anchor" aria-hidden="true" />
      <ModalOverlay
        className="sidebar-overlay"
        isOpen={ui.overlay.open}
        onOpenChange={(open) => ui.setOverlay(open)}
        isDismissable
      >
        <Modal className="sidebar-overlay__panel">
          {/* Following a link closes the overlay, the current page's too. */}
          <AriaDialog
            className="sidebar-overlay__dialog"
            aria-label="Navegação"
            onClick={(event) => {
              if ((event.target as Element).closest('a[href]')) ui.setOverlay(false);
            }}
          >
            <ProjectSidebar
              project={project}
              place="overlay"
              collapseLabel="Fechar a barra lateral"
              onCollapse={() => ui.setOverlay(false)}
              focusSearch={ui.overlay.search}
            />
          </AriaDialog>
        </Modal>
      </ModalOverlay>
      <CommandPalette switcherPlace={switcherPlace} toggleSidebar={toggleSidebar} />
      <ShortcutsDialog open={ui.shortcutsOpen} onClose={() => ui.setShortcutsOpen(false)} />
      {project && ui.newItemOpen && (
        <NewItemPopover project={project} triggerRef={anchor} isOpen onOpenChange={ui.setNewItemOpen} />
      )}
      {project && item && ui.moveOpen && (
        <MoveToProjectMenu
          type={item.type}
          id={item.id}
          projectId={project.id}
          triggerRef={anchor}
          isOpen
          onOpenChange={ui.setMoveOpen}
        />
      )}
    </div>
  );
}
