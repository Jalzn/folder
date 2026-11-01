import { Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { trackPageFocus } from '../ui';
import { AppLayout } from './AppLayout';
import { AppProvider } from './AppProvider';
import { AuthGate } from './AuthGate';
import { ShellUiProvider } from './shell-ui';

/** The root route: the session, then the app's context and shell around the page. */
export function AppRoot() {
  // Where the focus goes back to after a menu or a dialog, followed from here once, with its removal.
  useEffect(() => trackPageFocus(), []);
  return (
    <AuthGate>
      {(owner) => (
        <AppProvider owner={owner}>
          <ShellUiProvider>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </ShellUiProvider>
        </AppProvider>
      )}
    </AuthGate>
  );
}
