import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
export interface Config {
  databasePath: string;
  ownerName: string;
  ownerPassword: string | undefined;
  appOrigin: string;
  port: number;
  host: string;
  secureCookie: boolean;
  trustProxy: boolean;
  webDir: string | undefined;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 3370);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT precisa ser uma porta válida.');
  const appOrigin = env.APP_ORIGIN ?? 'http://localhost:5170';
  const origin = new URL(appOrigin);
  if (origin.origin !== appOrigin || !['http:', 'https:'].includes(origin.protocol))
    throw new Error('APP_ORIGIN precisa conter a origem exata, sem caminho ou barra final.');
  const production = env.NODE_ENV === 'production';
  if (production && origin.protocol !== 'https:') throw new Error('APP_ORIGIN deve usar HTTPS em produção.');
  return {
    databasePath:
      env.DATABASE_PATH === ':memory:'
        ? ':memory:'
        : resolve(repositoryRoot, env.DATABASE_PATH ?? 'data/tinyfold.sqlite'),
    ownerName: env.OWNER_NAME ?? 'Você',
    ownerPassword: env.OWNER_PASSWORD,
    appOrigin,
    port,
    host: env.HOST ?? '127.0.0.1',
    secureCookie: production || env.COOKIE_SECURE === 'true',
    trustProxy: env.TRUST_PROXY === 'true',
    webDir: env.WEB_DIR ? resolve(repositoryRoot, env.WEB_DIR) : undefined,
  };
}
