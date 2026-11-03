import { Hono } from 'hono';
import { sql } from 'kysely';
import type { AccessTokenService, AuthService } from '#auth';
import type { Database } from '#core/infra';
import { project } from '#project';
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
  const application = project.applications.server.create({
    db,
    ...(auth ? { auth } : {}),
    ...(accessTokens ? { accessTokens } : {}),
    clock,
    logError,
  });
  const { auth: authService, accessTokens: accessTokenService, workspace } = application.services;
  try {
    const app = new Hono();
    const pending = new Set<Promise<unknown>>();
    let disposal: Promise<void> | undefined;
    let disposed = false;
    const track = <T>(work: () => T | Promise<T>): Promise<T> => {
      const result = Promise.resolve().then(work);
      pending.add(result);
      void result.then(
        () => pending.delete(result),
        () => pending.delete(result),
      );
      return result;
    };
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
      tools: workspace.tools.map((tool) => ({
        ...tool,
        handler(input) {
          if (disposed) return Promise.reject(new Error('Servidor encerrando.'));
          // Legacy SSE and aborted modern requests can finish their HTTP fetch before the tool.
          return track(() => tool.handler(input));
        },
      })),
      config,
      clock,
      logError,
    });
    mountSpa(app, config.webDir);
    const fetch = app.fetch;
    app.fetch = (...args) => {
      if (disposal) return Promise.resolve(new Response('Servidor encerrando.', { status: 503 }));
      return track(() => fetch(...args));
    };
    return Object.assign(app, {
      dispose() {
        disposal ??= (async () => {
          while (pending.size) await Promise.allSettled([...pending]);
          disposed = true;
          application.dispose();
        })();
        return disposal;
      },
    });
  } catch (error) {
    application.dispose();
    throw error;
  }
}
