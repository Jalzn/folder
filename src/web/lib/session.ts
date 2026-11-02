import { api, queryClient } from './api';
import { keys } from './queries/keys';
import { signedOut } from './session-events';

/** Signs out: the server ends the session, the workspace is forgotten and AuthGate shows the login. Throws as the logout does. */
export async function signOut() {
  await api.auth.logout();
  queryClient.removeQueries({ queryKey: keys.all });
  signedOut();
}
