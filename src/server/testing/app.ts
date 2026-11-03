import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { createAccessTokens, createAuthService } from '@tinyfold/auth';
import { useTestDatabases } from '@tinyfold/core/testing';
import { createApp } from '../app.js';
import { modules } from '../modules.js';
import type { AppClient } from '../router.js';
export function useAppFixture(password: string, origin = 'http://localhost:5170') {
  const databases = useTestDatabases(modules, 'tinyfold-server-');
  return async ({
    clock = () => new Date(),
    trustProxy = false,
    web = true,
    warn,
    logError,
  }: {
    clock?: () => Date;
    trustProxy?: boolean;
    web?: boolean;
    warn?: (message: string) => void;
    logError?: (error: unknown) => void;
  } = {}) => {
    const database = await databases.create();
    const { db, folder } = database;
    const auth = createAuthService(db, { clock, ...(warn ? { warn } : {}) });
    await auth.ensureOwner({ name: 'Você', password });
    const accessTokens = createAccessTokens(db, { clock });
    const webDir = web ? join(folder, 'web') : undefined;
    if (webDir) {
      await mkdir(join(webDir, 'assets'), { recursive: true });
      await writeFile(join(webDir, 'index.html'), '<!doctype html><title>Tinyfold</title>');
      await writeFile(join(webDir, 'assets', 'test.js'), '/* built asset */');
    }
    const app = createApp({
      db,
      auth,
      accessTokens,
      clock,
      ...(logError ? { logError } : {}),
      config: { appOrigin: origin, secureCookie: true, trustProxy, webDir },
    });
    function browser(requestOrigin = origin) {
      const state = { cookie: undefined as string | undefined, setCookies: [] as string[] };
      const client: AppClient = createORPCClient(
        new RPCLink({
          url: 'http://localhost/rpc',
          headers: () => ({ origin: requestOrigin, ...(state.cookie ? { cookie: state.cookie } : {}) }),
          fetch: async (request) => {
            const response = await app.fetch(request);
            state.setCookies = response.headers.getSetCookie();
            for (const header of state.setCookies) {
              const pair = header.split(';')[0];
              if (pair) state.cookie = pair.endsWith('=') ? undefined : pair;
            }
            return response;
          },
        }),
      );
      return { client, state };
    }
    return { db, folder, auth, accessTokens, app, browser };
  };
}
