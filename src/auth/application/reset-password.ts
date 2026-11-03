import { toIsoInstant } from '@tinyfold/core/domain';
import { validatePassword } from '../domain/index.js';
import { authErrors } from './errors.js';
import type { AuthContext } from './ports.js';

export async function resetPassword(deps: AuthContext, password: string) {
  validatePassword(password);
  const hash = await deps.password.hash(password);
  await deps.transaction(async (repo) => {
    if (!(await repo.owner())) throw authErrors.ownerMissing();
    await repo.updatePassword(hash, toIsoInstant(deps.now()));
    await repo.deleteSessionsExcept();
    await repo.deleteAccessTokens();
  });
}
