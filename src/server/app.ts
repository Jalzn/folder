import { type AccessTokenService, type AuthService, createAccessTokens, createAuthService } from '@tinyfold/auth';
import type { Database } from '@tinyfold/core/infra';
import { createWorkspace } from '@tinyfold/workspace';
import { Hono } from 'hono';
import { sql } from 'kysely';
import type { Config } from './config.js';
import { mountCanvasPreviewRoute } from './files/canvas-preview-route.js';
import { mountMcp } from './mcp/endpoint.js';
import { createRouter } from './router.js';
import { mountRpc } from './rpc.js';
import { mountSecurityHeaders } from './security-headers.js';
import { mountSpa } from './spa.js';

export interface AppDependencies {
  db: Database;
  config: Pick<Config, 'appOrigin' | 'secureCookie' | 'trustProxy' | 'webDir'>;
  auth?: AuthService;
  accessTokens?: AccessTokenService;
  clock?: () => Date;
  logError?: (error: unknown) => void;
}

export function createApp({
  db,
  config,
  auth,
  accessTokens,
  clock = () => new Date(),
  logError = console.error,
}: AppDependencies) {
  const authService = auth ?? createAuthService(db, { clock });
  const accessTokenService = accessTokens ?? createAccessTokens(db, { clock, logError });
  const workspace = createWorkspace(db, { clock, logError, timeZone: () => authService.timeZone() });
  const app = new Hono();
  mountSecurityHeaders(app);
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.get('/ready', async (c) => {
    await sql`select 1`.execute(db);
    return c.json({ status: 'ok' });
  });
  mountRpc(app, {
    router: createRouter(authService, accessTokenService, workspace.router),
    auth: authService,
    config,
    clock,
    logError,
  });
  mountCanvasPreviewRoute(app, {
    auth: authService,
    files: workspace.files,
    secureCookie: config.secureCookie,
    clock,
  });
  mountMcp(app, {
    accessTokens: accessTokenService,
    tools: workspace.tools,
    config,
    clock,
    logError,
  });
  mountSpa(app, config.webDir);
  return app;
}
