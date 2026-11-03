import type { AuthContext } from './ports.js';

export async function revokeOtherSessions(deps: AuthContext, currentId: string) {
  await deps.store.deleteSessionsExcept(currentId);
  return { ok: true as const };
}
