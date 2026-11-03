import type { AuthContext } from './ports.js';

export async function listSessions(deps: AuthContext, currentId: string) {
  return (await deps.store.listSessions(deps.now().toISOString())).map(({ digest: _digest, ...session }) => ({
    ...session,
    current: session.id === currentId,
  }));
}
