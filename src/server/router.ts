import type { RouterClient } from '@orpc/server';
import { type AccessTokenService, type AuthService, createAuthRouter } from '#auth';

import type { Workspace } from './workspace/index.js';

export function createRouter(auth: AuthService, accessTokens: AccessTokenService, workspace: Workspace['router']) {
  // Civil dates (today, overdue tasks, the done window) hold in the owner's time zone.
  return {
    auth: createAuthRouter(auth, accessTokens),
    workspace,
  };
}
export type AppRouter = ReturnType<typeof createRouter>;
export type AppClient = RouterClient<AppRouter>;
