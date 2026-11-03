import { toIsoInstant } from '#core/domain';
import { type AccessTokenScope, shouldRecordUse } from '../../domain/access-token.js';
import type { AccessTokenDeps } from './ports.js';

export interface AuthenticatedAccessToken {
  id: string;
  scope: AccessTokenScope;
}

/** Resolves a bearer token. Anything that is not a live token yields undefined. */
export async function authenticateAccessToken(
  deps: AccessTokenDeps,
  token: string | undefined,
): Promise<AuthenticatedAccessToken | undefined> {
  if (!token || !deps.secrets.isWellFormed(token)) return undefined;
  const record = await deps.store.findByDigest(deps.secrets.digest(token));
  if (!record) return undefined;
  const now = deps.now();
  if (shouldRecordUse(record.lastUsedAt, now)) {
    // The last use is informative; failing to record it must not deny a valid token.
    await deps.store.touch(record.id, toIsoInstant(now)).catch(deps.logError);
  }
  return { id: record.id, scope: record.scope };
}
