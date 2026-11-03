import { join } from 'node:path';
import { createTempDatabase } from '../../src/core/testing/index.js';
import { snapshot } from '../storage.js';
export async function backupRoundTrip(prefix: string) {
  const database = await createTempDatabase([], prefix);
  const source = database.path,
    backup = join(database.folder, 'backup.sqlite'),
    restored = join(database.folder, 'restored.sqlite');
  return {
    db: database.db,
    source,
    restored,
    backup: () => snapshot(source, backup),
    restore: async () => {
      await snapshot(backup, restored);
      return database.open('restored.sqlite');
    },
    dispose: () => database.dispose(),
  };
}
