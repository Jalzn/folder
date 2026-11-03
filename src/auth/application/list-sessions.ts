import { toIsoInstant } from '#core/domain';
import type { AuthContext } from './ports.js';

export async function listSessions(deps: AuthContext, currentId: string) {
  return (await deps.store.listSessions(toIsoInstant(deps.now()))).map(({ digest: _digest, ...session }) => ({
    ...session,
    current: session.id === currentId,
  }));
}
