import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { sql } from 'kysely';
import {
  type Database,
  executeMigrationScript,
  type ForeignKeyViolation,
  foreignKeyViolations,
  registerSqlFunctions,
  setForeignKeys,
  tables,
  writeTransaction,
} from './db.js';
import type { ModuleDefinition } from './module.js';

interface MigrationTable {
  module: string;
  version: number;
  name: string;
  checksum: string;
  applied_at: string;
}
export interface AppliedMigration {
  module: string;
  version: number;
  name: string;
}

/**
 * The first line of a migration that rebuilds a table other tables refer to. Inside a transaction
 * SQLite ignores `PRAGMA foreign_keys`, and dropping a referenced table with the keys on would delete
 * or refuse the rows that point at it. The line is part of the file, and of its checksum.
 */
export const FOREIGN_KEYS_OFF = '-- migrate: foreign_keys off';

const needsForeignKeysOff = (source: string) => source.split(/\r?\n/, 1)[0]?.trim() === FOREIGN_KEYS_OFF;

const describeViolations = (violations: readonly ForeignKeyViolation[]) =>
  violations
    .slice(0, 10)
    .map((row) => `${row.table} row ${row.rowid ?? '?'} -> ${row.parent}`)
    .join('; ');

/** The migrations already applied, read before the write lock so the runner knows how to start. */
async function appliedVersions(db: Database): Promise<Set<string>> {
  const table = await sql<{ name: string }>`select name from sqlite_master
    where type = 'table' and name = 'core_schema_migrations'`.execute(db);
  if (!table.rows.length) return new Set();
  const rows = await sql<{ module: string; version: number }>`select module, version
    from core_schema_migrations`.execute(db);
  return new Set(rows.rows.map((row) => `${row.module}/${row.version}`));
}

/**
 * Applies every pending migration of the modules in one transaction (BEGIN IMMEDIATE), after
 * registering their SQL functions on the connection. When a pending migration starts with
 * FOREIGN_KEYS_OFF, the keys go off on the connection before the transaction, `foreign_key_check`
 * must come back clean before the commit (any row aborts it, and nothing is applied), and the keys
 * go back on afterwards, also on failure; if they do not, the runner throws and the server does not
 * start. A migration without the line runs with the keys on, as always.
 */
export async function migrate(db: Database, modules: readonly ModuleDefinition[]): Promise<AppliedMigration[]> {
  // Read files before obtaining the database write lock.
  const available = await Promise.all(
    modules.map(async (module) => {
      const names = (await readdir(module.migrations)).filter((name) => name.endsWith('.sql')).sort();
      const files = await Promise.all(
        names.map(async (name) => {
          const match = /^(\d{3})_([a-z0-9_]+)\.sql$/.exec(name);
          if (!match?.[1] || !match[2]) throw new Error(`Invalid migration filename: ${module.id}/${name}`);
          const source = await readFile(new URL(name, module.migrations), 'utf8');
          return {
            module: module.id,
            version: Number(match[1]),
            name: match[2],
            source,
            checksum: createHash('sha256').update(source).digest('hex'),
            foreignKeysOff: needsForeignKeysOff(source),
          };
        }),
      );
      if (new Set(files.map((file) => file.version)).size !== files.length)
        throw new Error(`Duplicate migration version: ${module.id}`);
      return { module, files };
    }),
  );
  for (const { module } of available) if (module.sqlFunctions) registerSqlFunctions(db, module.sqlFunctions);
  const done = await appliedVersions(db);
  const keysOff = available.some(({ module, files }) =>
    files.some((file) => file.foreignKeysOff && !done.has(`${module.id}/${file.version}`)),
  );
  if (keysOff) setForeignKeys(db, false);
  try {
    return await applyPending(db, available, keysOff);
  } finally {
    if (keysOff) setForeignKeys(db, true);
  }
}

interface MigrationFile {
  module: string;
  version: number;
  name: string;
  source: string;
  checksum: string;
  foreignKeysOff: boolean;
}

function applyPending(
  db: Database,
  available: readonly { module: ModuleDefinition; files: MigrationFile[] }[],
  keysOff: boolean,
): Promise<AppliedMigration[]> {
  return writeTransaction(db, async (trx) => {
    await sql`CREATE TABLE IF NOT EXISTS core_schema_migrations (module TEXT NOT NULL, version INTEGER NOT NULL, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL, PRIMARY KEY (module, version))`.execute(
      trx,
    );
    const store = tables<{ core_schema_migrations: MigrationTable }>(trx);
    const applied: AppliedMigration[] = [];
    for (const { module, files } of available) {
      const done = await store
        .selectFrom('core_schema_migrations')
        .selectAll()
        .where('module', '=', module.id)
        .execute();
      for (const row of done) {
        const file = files.find((item) => item.version === row.version);
        if (!file || file.checksum !== row.checksum)
          throw new Error(`Applied migration changed or missing: ${module.id}/${row.version}`);
      }
      for (const file of files.filter((candidate) => !done.some((row) => row.version === candidate.version))) {
        // Another runner may have applied migrations since the keys were set; never run this one with them on.
        if (file.foreignKeysOff && !keysOff)
          throw new Error(`Migration needs foreign keys off: ${module.id}/${file.version}. Run the migrations again.`);
        executeMigrationScript(db, file.source);
        await store
          .insertInto('core_schema_migrations')
          .values({
            module: file.module,
            version: file.version,
            name: file.name,
            checksum: file.checksum,
            applied_at: new Date().toISOString(),
          })
          .execute();
        applied.push({ module: file.module, version: file.version, name: file.name });
      }
    }
    if (keysOff) {
      const violations = foreignKeyViolations(db);
      if (violations.length)
        throw new Error(`Foreign key check failed after the migrations: ${describeViolations(violations)}.`);
    }
    return applied;
  });
}
