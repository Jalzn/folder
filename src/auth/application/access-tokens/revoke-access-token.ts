import type { AccessTokenDeps } from './ports.js';

/** Revoking an unknown or already revoked token succeeds, like revoking a session. */
export async function revokeAccessToken(deps: AccessTokenDeps, input: { id: string }): Promise<{ ok: true }> {
  await deps.store.delete(input.id);
  return { ok: true };
}
