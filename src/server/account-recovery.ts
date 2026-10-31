import { createAccessTokens, createAuthService } from '@tinyfold/auth';
import type { Database } from '@tinyfold/core/infra';

/** Terminal recovery of a compromised account: a new password, with every session and access token revoked. */
export async function resetOwnerPassword(db: Database, password: string): Promise<void> {
  await createAuthService(db).resetPassword(password);
  await createAccessTokens(db).revokeAll();
}
