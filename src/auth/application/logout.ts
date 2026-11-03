import type { AuthContext } from './ports.js';

export async function logout(deps: AuthContext, sessionId: string) {
  await deps.store.deleteSession(sessionId);
  return { ok: true as const };
}
