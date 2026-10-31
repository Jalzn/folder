import { type AccessTokenService, type AuthService, createAuthRouter } from '@tinyfold/auth';
import type { Database } from '@tinyfold/core/infra';
import { createWorkspaceRouter } from '@tinyfold/workspace';

export function createRouter(db: Database, auth: AuthService, accessTokens: AccessTokenService) {
  return { auth: createAuthRouter(auth, accessTokens), workspace: createWorkspaceRouter(db) };
}
export type AppRouter = ReturnType<typeof createRouter>;
export type Router = AppRouter;
