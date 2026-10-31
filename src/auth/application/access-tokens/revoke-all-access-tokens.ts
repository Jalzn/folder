import type { AccessTokenDeps } from './ports.js';

/** Part of recovering a compromised account, together with the terminal password reset. */
export async function revokeAllAccessTokens(deps: AccessTokenDeps): Promise<void> {
  await deps.read.deleteAll();
}
