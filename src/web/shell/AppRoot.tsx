import { Outlet } from '@tanstack/react-router';
import { AppLayout } from './AppLayout';
import { AppProvider } from './AppProvider';
import { AuthGate } from './AuthGate';

/** The root route: the session, then the app's context and shell around the page. */
export function AppRoot() {
  return (
    <AuthGate>
      {(owner) => (
        <AppProvider owner={owner}>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </AppProvider>
      )}
    </AuthGate>
  );
}
