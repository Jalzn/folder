import { type AccessTokenService, type AuthService, createAccessTokens, createAuthService } from '#auth';
import { defineApplication } from '#core/application';
import type { Database } from '#core/infra';
import { createWorkspace } from './workspace/index.js';

export interface ServerApplicationContext {
  db: Database;
  auth?: AuthService;
  accessTokens?: AccessTokenService;
  clock?: () => Date;
  logError?: (error: unknown) => void;
}

export const serverApplication = defineApplication({
  id: 'server',
  setup({ db, auth, accessTokens, clock = () => new Date(), logError = console.error }: ServerApplicationContext) {
    const authService = auth ?? createAuthService(db, { clock });
    const accessTokenService = accessTokens ?? createAccessTokens(db, { clock, logError });
    const workspace = createWorkspace(db, { clock, logError, timeZone: () => authService.timeZone() });
    return {
      modules: workspace.modules,
      services: { auth: authService, accessTokens: accessTokenService, workspace },
      dispose() {
        workspace.dispose();
        return undefined;
      },
    };
  },
});
