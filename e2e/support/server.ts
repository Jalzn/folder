import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** OWNER_PASSWORD of the suite's server, started by playwright.config.ts. */
export const E2E_PASSWORD = 'tinyfold-e2e-passphrase';

/** The environment of a test server: the built web, an owner and a database of its own. */
export function serverEnv({
  port,
  databasePath,
  password = E2E_PASSWORD,
}: {
  port: number;
  databasePath: string;
  password?: string;
}) {
  return {
    DATABASE_PATH: databasePath,
    OWNER_PASSWORD: password,
    OWNER_NAME: 'Você',
    APP_ORIGIN: `http://localhost:${port}`,
    PORT: String(port),
    HOST: '127.0.0.1',
    WEB_DIR: 'src/web/dist',
    COOKIE_SECURE: 'false',
    NODE_ENV: 'test',
  };
}

/**
 * The folder of this run's database, chosen once: the config is read again in each worker, which inherits the
 * choice. The server makes the folder, and global-teardown.ts removes it.
 */
export function runDataDirectory() {
  process.env.TINYFOLD_E2E_DATA ??= join(tmpdir(), `tinyfold-e2e-${randomUUID()}`);
  return process.env.TINYFOLD_E2E_DATA;
}
