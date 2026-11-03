import { ORPCError, onError } from '@orpc/server';
import { BodyLimitPlugin, RPCHandler } from '@orpc/server/fetch';
import type { Hono } from 'hono';
import type { AuthService } from '#auth';
import { clientIp } from './client-ip.js';
import type { Config } from './config.js';
import { cookieSession } from './cookie-session.js';
import type { AppRouter } from './router.js';
export function mountRpc(
  app: Hono,
  {
    router,
    auth,
    config,
    clock,
    logError,
  }: {
    router: AppRouter;
    auth: AuthService;
    config: Pick<Config, 'appOrigin' | 'secureCookie' | 'trustProxy'>;
    clock: () => Date;
    logError: (error: unknown) => void;
  },
) {
  const rpc = new RPCHandler(router, {
    plugins: [new BodyLimitPlugin({ maxBodySize: 2 * 1024 * 1024 })],
    interceptors: [
      onError((error) => {
        if (!(error instanceof ORPCError) || error.status >= 500) logError(error);
      }),
    ],
  });
  app.all('/rpc/*', async (c) => {
    const { session, cookies, setCookies } = await cookieSession(c, auth, clock(), config.secureCookie);
    const { matched, response } = await rpc.handle(c.req.raw, {
      prefix: '/rpc',
      context: {
        originAllowed: c.req.header('origin') === config.appOrigin,
        session: session ? { owner: session.owner, sessionId: session.sessionId } : undefined,
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
}
