import { authErrors } from './errors.js';
import type { AuthContext } from './ports.js';

export async function revokeSession(deps: AuthContext, currentId: string, targetId: string) {
  if (currentId === targetId) throw authErrors.revokeCurrentSession();
  await deps.store.deleteSession(targetId);
  return { ok: true as const };
}
