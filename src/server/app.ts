import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { ORPCError, onError } from '@orpc/server';
import { BodyLimitPlugin, RPCHandler } from '@orpc/server/fetch';
import { type AccessTokenService, type AuthService, createAccessTokens, createAuthService } from '@tinyfold/auth';
import type { Database, RequestContext } from '@tinyfold/core/infra';
import { type Context, Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { secureHeaders } from 'hono/secure-headers';
import { sql } from 'kysely';
import type { Config } from './config.js';
import { createRouter } from './router.js';
import { clearedSessionCookie, sessionCookie, sessionCookieName } from './session-cookie.js';

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
  const rpc = new RPCHandler(createRouter(db, authService, accessTokenService), {
    plugins: [new BodyLimitPlugin({ maxBodySize: 2 * 1024 * 1024 })],
    interceptors: [
      onError((error) => {
        if (!(error instanceof ORPCError) || error.status >= 500) logError(error);
      }),
    ],
  });
  const app = new Hono();
  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
      referrerPolicy: 'no-referrer',
      xFrameOptions: 'DENY',
    }),
  );
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.get('/ready', async (c) => {
    await sql`select 1`.execute(db);
    return c.json({ status: 'ok' });
  });
  app.all('/rpc/*', async (c) => {
    const now = clock();
    const token = getCookie(c, sessionCookieName);
    const session = await authService.authenticate(token);
    const setCookies: string[] = [];
    const cookies: RequestContext['cookies'] = {
      setSession: (value, expiry) => setCookies.push(sessionCookie(value, expiry, now, config.secureCookie)),
      clearSession: () => setCookies.push(clearedSessionCookie(config.secureCookie)),
    };
    if (session?.renewed && token) cookies.setSession(token, session.expiresAt);
    if (token && !session) cookies.clearSession();
    const { matched, response } = await rpc.handle(c.req.raw, {
      prefix: '/rpc',
      context: {
        db,
        now,
        originAllowed: c.req.header('origin') === config.appOrigin,
        session: session ? { owner: session.owner, sessionId: session.sessionId, token: session.token } : undefined,
        client: { ip: clientIp(c, config.trustProxy), userAgent: c.req.header('user-agent') },
        cookies,
      },
    });
    if (!matched) return c.json({ message: 'Este endereço não existe.' }, 404);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    for (const value of setCookies) headers.append('Set-Cookie', value);
    return new Response(response.body, { status: response.status, headers });
  });
  if (config.webDir) {
    app.use('*', async (c, next) => {
      await next();
      if (c.res.ok)
        c.header(
          'Cache-Control',
          c.req.path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
    });
    app.use('*', serveStatic({ root: config.webDir }));
    app.get(
      '*',
      async (c, next) => (/\.[^/]+$/.test(c.req.path) ? c.notFound() : next()),
      serveStatic({ root: config.webDir, path: 'index.html' }),
    );
  }
  return app;
}

function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const ip = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
    if (ip) return ip;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
