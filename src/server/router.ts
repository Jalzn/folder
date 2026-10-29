import { type AuthService, createAuthRouter } from '@tinyfold/auth';
import type { Database } from '@tinyfold/core/infra';
import { createWorkspaceRouter } from '@tinyfold/workspace';

export function createRouter(db: Database, auth: AuthService) {
  return { auth: createAuthRouter(auth), workspace: createWorkspaceRouter(db) };
}
export type AppRouter = ReturnType<typeof createRouter>;
export type Router = AppRouter;
