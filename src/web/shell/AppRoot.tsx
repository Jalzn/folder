import { Outlet } from '@tanstack/react-router';
import { AppLayout } from './AppLayout';
import { AppProvider } from './AppProvider';
import { AuthGate } from './AuthGate';
import { ShellUiProvider } from './shell-ui';

/** The root route: the session, then the app's context and shell around the page. */
export function AppRoot() {
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
