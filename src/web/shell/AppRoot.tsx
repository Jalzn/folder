import { Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { trackPageFocus } from '../ui';
import { AppLayout } from './AppLayout';
import { AppProvider } from './AppProvider';
import { AuthGate } from './AuthGate';
import { ItemChangesProvider } from './item-changes';
import { ShellUiProvider } from './shell-ui';
import { TaskDrawerProvider } from './task-drawer-state';

/** The root route: the session, then the app's context and shell around the page. */
export function AppRoot() {
  // Where the focus goes back to after a menu or a dialog, followed from here once, with its removal.
  useEffect(() => trackPageFocus(), []);
  return (
    <AuthGate>
      {(owner) => (
        <AppProvider owner={owner}>
          <ItemChangesProvider>
            <ShellUiProvider>
              <TaskDrawerProvider>
                <AppLayout>
                  <Outlet />
                </AppLayout>
              </TaskDrawerProvider>
            </ShellUiProvider>
          </ItemChangesProvider>
        </AppProvider>
      )}
    </AuthGate>
  );
}
