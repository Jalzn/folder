import { canonicalTimeZone } from '@tinyfold/core/domain';
import { isOffset } from '../domain/index.js';
import { authErrors } from './errors.js';
import type { AuthContext } from './ports.js';

export async function setTimeZone(deps: AuthContext, timeZone: string) {
  if (isOffset(timeZone)) throw authErrors.offsetTimeZone();
  const canonical = canonicalTimeZone(timeZone);
  if (!canonical) throw authErrors.unknownTimeZone();
  await deps.transaction(async (repo) => {
    if (!(await repo.owner())) throw authErrors.ownerMissing();
    await repo.setTimeZone(canonical);
  });
  return { timeZone: canonical };
}
