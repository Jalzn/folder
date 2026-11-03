import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { AnnouncerProvider, useAnnounce } from './announcer';
import { createLayerStack } from './keyboard/layers';
import { BoardFiltersProvider, boardFilters } from './state/board-filters';
import { OverlaysProvider, overlays } from './state/overlays';
import { PageUiProvider, pageUi } from './state/page';
import { SidebarRequestsProvider, sidebarRequests } from './state/sidebar-requests';
import type { ShellActions, ShellState } from './state/types';

export type { PageAction, PageCommands, SwitcherPlace } from './state/types';

const ActionsContext = createContext<ShellActions | null>(null);
export function useShellActions() {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('A interface do shell está indisponível.');
  return value;
}
export const useOptionalShellUi = () => useContext(ActionsContext);
export const useBoardFilters = boardFilters.useState;
export const usePageUi = pageUi.useState;
export function useShellOverlays() {
  return { ...useShellActions(), ...overlays.useState() };
}
export function useSidebarRequests() {
  return { ...useShellActions(), ...sidebarRequests.useState() };
}
/** Compatibility facade for consumers that span several concerns. */
export function useShellUi(): ShellActions & ShellState {
  return {
    ...useShellActions(),
    ...overlays.useState(),
    ...sidebarRequests.useState(),
    ...pageUi.useState(),
    ...boardFilters.useState(),
  };
}
export function ShellUiProvider({ children }: { children: ReactNode }) {
  return (
    <AnnouncerProvider>
      <OverlaysProvider>
        <SidebarRequestsProvider>
          <PageUiProvider>
            <BoardFiltersProvider>
              <ShellActionsProvider>{children}</ShellActionsProvider>
            </BoardFiltersProvider>
          </PageUiProvider>
        </SidebarRequestsProvider>
      </OverlaysProvider>
    </AnnouncerProvider>
  );
}
function ShellActionsProvider({ children }: { children: ReactNode }) {
  const announce = useAnnounce();
  const [layers] = useState(createLayerStack);
  const overlayActions = overlays.useActions();
  const sidebarActions = sidebarRequests.useActions();
  const pageActions = pageUi.useActions();
  const boardActions = boardFilters.useActions();
  const actions = useMemo<ShellActions>(
    () => ({ layers, announce, ...overlayActions, ...sidebarActions, ...pageActions, ...boardActions }),
    [layers, announce, overlayActions, sidebarActions, pageActions, boardActions],
  );
  return <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>;
}
