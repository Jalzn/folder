import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshot } from './storage.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, process.env.DATABASE_PATH ?? 'data/tinyfold.sqlite');
const directory = resolve(root, process.env.BACKUP_DIR ?? 'backups');
const name = `tinyfold-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
const destination = process.argv[2] ? resolve(process.argv[2]) : resolve(directory, name);
try {
  console.log(`Backup verificado: ${await snapshot(source, destination)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha ao criar o backup.');
  process.exitCode = 1;
}
