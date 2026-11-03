import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { type SwitcherPlace, useShellUi } from './shell-ui';
import { useSidebarPrefs } from './sidebar/use-sidebar-prefs';
import { useLayoutMode } from './use-layout-mode';
export function useSidebarMode() {
  const ui = useShellUi();
  const mode = useLayoutMode();
  const prefs = useSidebarPrefs();
  const pathname = useLocation({ select: (location) => location.pathname });
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
  // A folder to name or to show needs the sidebar: it expands from the rail, or opens over the page.
  const wantsSidebar = ui.folderDraft ?? ui.folderReveal;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each new request asks once.
  useEffect(() => {
    if (!wantsSidebar) return;
    if (mode === 'wide' && prefs.collapsed) prefs.setCollapsed(false);
    else if (rail || mode === 'narrow') setOverlay(true);
  }, [wantsSidebar]);
  return { mode, rail, prefs, switcherPlace, toggleSidebar, sidebarShown: !rail && mode !== 'narrow' };
}
export type SidebarMode = ReturnType<typeof useSidebarMode>;
