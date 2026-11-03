import { toIsoInstant } from '@tinyfold/core/domain';
import { validatePassword } from '../domain/index.js';
import { authErrors } from './errors.js';
import type { AuthContext } from './ports.js';

export async function changePassword(
  deps: AuthContext,
  sessionId: string,
  input: { currentPassword: string; newPassword: string },
) {
  validatePassword(input.newPassword);
  const owner = await deps.store.owner();
  if (!owner || !(await deps.password.verify(input.currentPassword, owner.passwordHash)))
    throw authErrors.wrongCurrentPassword();
  if (input.currentPassword === input.newPassword) throw authErrors.samePassword();
  const hash = await deps.password.hash(input.newPassword);
  await deps.transaction(async (repo) => {
    const current = await repo.owner();
    if (!current || current.passwordHash !== owner.passwordHash) throw authErrors.passwordConflict();
    const sessions = await repo.listSessions(toIsoInstant(deps.now()));
    if (!sessions.some((session) => session.id === sessionId)) throw authErrors.sessionEnded();
    await repo.updatePassword(hash, toIsoInstant(deps.now()));
    await repo.deleteSessionsExcept(sessionId);
  });
  return { ok: true as const };
}
