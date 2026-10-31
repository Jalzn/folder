import { serve } from '@hono/node-server';
import { createAuthService } from '@tinyfold/auth';
import { cleanupMutations, createDatabase, migrate } from '@tinyfold/core/infra';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { modules } from './modules.js';

const config = readConfig();
console.info(`Banco: ${config.databasePath}`);
const db = createDatabase(config.databasePath);
await migrate(db, modules);
const auth = createAuthService(db);
await auth.ensureOwner({ name: config.ownerName, ...(config.ownerPassword ? { password: config.ownerPassword } : {}) });
await cleanupMutations(db);
const cleanup = setInterval(() => {
  cleanupMutations(db).catch((error: unknown) => console.error('Falha na limpeza das solicitações antigas.', error));
}, 86_400_000);
cleanup.unref();
const app = createApp({ db, auth, config });
const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, () =>
  console.info(`Tinyfold em http://${config.host}:${config.port}`),
);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  clearInterval(cleanup);
  server.close(() => {
    db.destroy().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
