/** OWNER_PASSWORD of the worker's server, started by its fixture. */
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
