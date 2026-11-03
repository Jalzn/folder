import { createDatabase, migrate } from '#core/infra';
import { readConfig } from '../config.js';
import { modules } from '../modules.js';

const db = createDatabase(readConfig().databasePath);
try {
  const applied = await migrate(db, modules);
  console.info(`${applied.length} migração(ões) aplicada(s).`);
} finally {
  await db.destroy();
}
