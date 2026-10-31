import { createDatabase, migrate } from '@tinyfold/core/infra';
import { resetOwnerPassword } from '../account-recovery.js';
import { readConfig } from '../config.js';
import { modules } from '../modules.js';

const password = process.env.NEW_OWNER_PASSWORD;
if (!password) throw new Error('Defina NEW_OWNER_PASSWORD para redefinir a senha.');
const db = createDatabase(readConfig().databasePath);
try {
  await migrate(db, modules);
  await resetOwnerPassword(db, password);
  console.info('Senha redefinida. Todas as sessões e todos os tokens de acesso foram encerrados.');
} finally {
  await db.destroy();
}
