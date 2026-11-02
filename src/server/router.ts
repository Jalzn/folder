import { type AccessTokenService, type AuthService, createAuthRouter } from '@tinyfold/auth';
import type { Database } from '@tinyfold/core/infra';
import { createWorkspaceRouter } from '@tinyfold/workspace';

export function createRouter(db: Database, auth: AuthService, accessTokens: AccessTokenService) {
  // Civil dates (today, overdue tasks, the done window) hold in the owner's time zone.
  return {
    auth: createAuthRouter(auth, accessTokens),
    workspace: createWorkspaceRouter(db, { timeZone: () => auth.timeZone() }),
  };
}
export type AppRouter = ReturnType<typeof createRouter>;
