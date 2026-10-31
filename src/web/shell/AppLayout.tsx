import './layout.css';
import { useLocation } from '@tanstack/react-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Dialog as AriaDialog, Modal, ModalOverlay } from 'react-aria-components';
import { useLastLocation } from '../router/use-last-location';
import { useRouteFocus } from '../router/use-route-focus';
import { useApp } from './AppProvider';
import { useCurrentProject } from './project/use-current-project';
import { CollapsedRail } from './sidebar/CollapsedRail';
import { ProjectSidebar } from './sidebar/ProjectSidebar';
import { useSidebarPrefs } from './sidebar/use-sidebar-prefs';
import { TopBar } from './TopBar';
import { useLayoutMode } from './use-layout-mode';

/**
 * The shell's regions: the sidebar, fixed or as a rail, and the page (`main`, scrolling on its own). Below
 * 1100 px the full sidebar opens over the page, on a scrim, and closes when the page changes.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const app = useApp();
  const mode = useLayoutMode();
  const prefs = useSidebarPrefs();
  const { project } = useCurrentProject();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [overlayOpen, setOverlayOpen] = useState(false);
  const announcement = useRouteFocus();
  useLastLocation(app.owner.installationId);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new page closes the overlay.
  useEffect(() => setOverlayOpen(false), [pathname]);
  useEffect(() => {
    if (mode === 'wide') setOverlayOpen(false);
  }, [mode]);

  const rail = mode === 'medium' || (mode === 'wide' && prefs.collapsed);
  return (
    <div className="app-layout" data-mode={mode} data-rail={rail || undefined}>
      {mode === 'narrow' && <TopBar project={project} onMenu={() => setOverlayOpen(true)} />}
      {mode !== 'narrow' &&
        (rail ? (
          <CollapsedRail
            project={project}
            expandLabel={mode === 'wide' ? 'Expandir a barra lateral' : 'Abrir a barra lateral'}
            onExpand={() => (mode === 'wide' ? prefs.setCollapsed(false) : setOverlayOpen(true))}
          />
        ) : (
          <ProjectSidebar
            project={project}
            collapseLabel="Recolher a barra lateral"
            onCollapse={() => prefs.setCollapsed(true)}
          />
        ))}
      <main id="main-content" className="app-layout__main" data-scroll-key="page">
        {children}
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </main>
      <ModalOverlay className="sidebar-overlay" isOpen={overlayOpen} onOpenChange={setOverlayOpen} isDismissable>
        <Modal className="sidebar-overlay__panel">
          {/* Following a link closes the overlay, the current page's too. */}
          <AriaDialog
            className="sidebar-overlay__dialog"
            aria-label="Navegação"
            onClick={(event) => {
              if ((event.target as Element).closest('a[href]')) setOverlayOpen(false);
            }}
          >
            <ProjectSidebar
              project={project}
              collapseLabel="Fechar a barra lateral"
              onCollapse={() => setOverlayOpen(false)}
            />
          </AriaDialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
