import { serve } from '@hono/node-server';
import { createAuthService } from '@tinyfold/auth';
import { cleanupMutations, createDatabase, migrate } from '@tinyfold/core/infra';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { modules } from './modules.js';

const config = readConfig();
console.info(`Banco: ${config.databasePath}`);
const db = createDatabase(config.databasePath);
let app: ReturnType<typeof createApp> | undefined;
let server: ReturnType<typeof serve> | undefined;
let cleanup: ReturnType<typeof setInterval> | undefined;
let cleanupTask: Promise<void> | undefined;
let stopping: Promise<void> | undefined;

function stop(): Promise<void> {
  stopping ??= (async () => {
    clearInterval(cleanup);
    if (server?.listening)
      await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
    await cleanupTask;
    // A disconnected HTTP client can leave its accepted handler running after server.close().
    await app?.dispose();
    await db.destroy();
  })();
  return stopping;
}

try {
  await migrate(db, modules);
  const auth = createAuthService(db);
  await auth.ensureOwner({
    name: config.ownerName,
    ...(config.ownerPassword ? { password: config.ownerPassword } : {}),
  });
  await cleanupMutations(db);
  app = createApp({ db, auth, config });
  const fetch = app.fetch;
  await new Promise<void>((resolve, reject) => {
    server = serve({ fetch, hostname: config.host, port: config.port }, () => {
      server?.off('error', reject);
      console.info(`Tinyfold em http://${config.host}:${config.port}`);
      resolve();
    });
    server.once('error', reject);
  });
  cleanup = setInterval(() => {
    if (cleanupTask) return;
    cleanupTask = cleanupMutations(db)
      .catch((error: unknown) => console.error('Falha na limpeza das solicitações antigas.', error))
      .finally(() => {
        cleanupTask = undefined;
      });
  }, 86_400_000);
  cleanup.unref();
  const onSignal = () => {
    void stop().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error('Falha ao encerrar o servidor.', error);
        process.exit(1);
      },
    );
  };
  process.on('SIGTERM', onSignal);
  process.on('SIGINT', onSignal);
} catch (error) {
  try {
    await stop();
  } catch (cleanupError) {
    console.error('Falha ao liberar recursos da inicialização.', cleanupError);
  }
  throw error;
}
