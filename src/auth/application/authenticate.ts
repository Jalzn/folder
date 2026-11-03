import { renewalIntervalMs, sessionLifetimeMs } from '../domain/index.js';
import type { AuthContext } from './ports.js';

export async function authenticate(deps: AuthContext, token: string | undefined) {
  if (!token || !deps.tokens.isWellFormed(token)) return undefined;
  const digest = deps.tokens.digest(token);
  const now = deps.now();
  return deps.transaction(async (repo) => {
    const session = await repo.session(digest);
    if (!session) return undefined;
    if (session.expiresAt <= now.toISOString()) {
      await repo.deleteSession(session.id);
      return undefined;
    }
    const owner = await repo.owner();
    if (!owner) return undefined;
    const renewed = now.getTime() - Date.parse(session.lastUsedAt) >= renewalIntervalMs;
    let expiresAt = new Date(session.expiresAt);
    if (renewed) {
      expiresAt = new Date(now.getTime() + sessionLifetimeMs);
      await repo.renewSession(session.id, now.toISOString(), expiresAt.toISOString());
    }
    return { owner: deps.profile(owner), sessionId: session.id, token, renewed, expiresAt };
  });
}
