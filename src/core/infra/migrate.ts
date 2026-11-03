import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { sql } from 'kysely';
import type { IsoInstant } from '#core/domain';
import { toIsoInstant } from '../domain/instant.js';
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
import type { MigrationModuleDefinition } from './module.js';

interface MigrationTable {
  module: string;
  version: number;
  name: string;
  checksum: string;
  applied_at: IsoInstant;
}
export interface AppliedMigration {
  module: string;
  version: number;
  name: string;
}

const describeViolations = (violations: readonly ForeignKeyViolation[]) =>
  violations
    .slice(0, 10)
    .map((row) => `${row.table} row ${row.rowid ?? '?'} -> ${row.parent}`)
    .join('; ');

/**
 * The violations after the migrations that were not there before. A row with the same table, rowid
 * and parent as before is old; the old ones left unmatched, from a rebuilt table that gave its rows
 * new rowids, are matched by table and parent alone.
 */
function newViolations(before: readonly ForeignKeyViolation[], after: readonly ForeignKeyViolation[]) {
  const exact = (row: ForeignKeyViolation) => JSON.stringify([row.table, row.rowid, row.parent]);
  const loose = (row: ForeignKeyViolation) => JSON.stringify([row.table, row.parent]);
  const seen = new Set(before.map(exact));
  const kept = new Set(after.map(exact));
  const unmatched = new Map<string, number>();
  for (const row of before) if (!kept.has(exact(row))) unmatched.set(loose(row), (unmatched.get(loose(row)) ?? 0) + 1);
  return after.filter((row) => {
    if (seen.has(exact(row))) return false;
    const left = unmatched.get(loose(row)) ?? 0;
    if (left > 0) unmatched.set(loose(row), left - 1);
    return left === 0;
  });
}

export interface MigrateOptions {
  /** Receives what the runner leaves as it was but should be repaired, such as an old orphan row. */
  warn?: (message: string) => void;
}

/**
 * Applies every pending migration of the modules in one transaction (BEGIN IMMEDIATE), after
 * registering their SQL functions on the connection, always with the foreign keys off: SQLite
 * ignores `PRAGMA foreign_keys` inside a transaction, so they go off on the connection before it.
 *
 * With the keys on, rebuilding a table others refer to (the 12-step procedure: create, copy, drop,
 * rename) would delete or refuse the rows that point at it when the old table is dropped, with no
 * error. A per-file directive, or reading the SQL for DROP TABLE, can be misspelt or fooled, so no
 * migration runs with them. The cost is that no cascade or reference check fires inside a migration
 * either: before the commit, `foreign_key_check` must find no violation that was not there when the
 * transaction began, so a migration that left an orphan, or counted on ON DELETE CASCADE to clean
 * one up, is refused and nothing is applied. Violations from before, left by manual SQL, do not
 * block the upgrade: they go to `warn`, with their table and rowid. The keys go back on afterwards,
 * also on failure; if they do not, the runner throws and the server does not start.
 */
export async function migrate(
  db: Database,
  modules: readonly MigrationModuleDefinition[],
  { warn = console.warn }: MigrateOptions = {},
): Promise<AppliedMigration[]> {
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
          };
        }),
      );
      if (new Set(files.map((file) => file.version)).size !== files.length)
        throw new Error(`Duplicate migration version: ${module.id}`);
      return { module, files };
    }),
  );
  for (const { module } of available) if (module.sqlFunctions) registerSqlFunctions(db, module.sqlFunctions);
  setForeignKeys(db, false);
  try {
    return await applyPending(db, available, warn);
  } finally {
    setForeignKeys(db, true);
  }
}

interface MigrationFile {
  module: string;
  version: number;
  name: string;
  source: string;
  checksum: string;
}

function applyPending(
  db: Database,
  available: readonly { module: MigrationModuleDefinition; files: MigrationFile[] }[],
  warn: (message: string) => void,
): Promise<AppliedMigration[]> {
  return writeTransaction(db, async (trx) => {
    await sql`CREATE TABLE IF NOT EXISTS core_schema_migrations (module TEXT NOT NULL, version INTEGER NOT NULL, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL, PRIMARY KEY (module, version))`.execute(
      trx,
    );
    const store = tables<{ core_schema_migrations: MigrationTable }>(trx);
    const pending: MigrationFile[] = [];
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
      pending.push(...files.filter((candidate) => !done.some((row) => row.version === candidate.version)));
    }
    if (!pending.length) return [];
    // The check reads every row that refers to another, so it runs only when there is something to apply.
    const before = foreignKeyViolations(db);
    const applied: AppliedMigration[] = [];
    for (const file of pending) {
      executeMigrationScript(db, file.source);
      await store
        .insertInto('core_schema_migrations')
        .values({
          module: file.module,
          version: file.version,
          name: file.name,
          checksum: file.checksum,
          applied_at: toIsoInstant(new Date()),
        })
        .execute();
      applied.push({ module: file.module, version: file.version, name: file.name });
    }
    const violations = newViolations(before, foreignKeyViolations(db));
    if (violations.length)
      throw new Error(`Foreign key check failed after the migrations: ${describeViolations(violations)}.`);
    if (before.length)
      warn(
        `Foreign key violations from before the migrations, left as they were (${before.length}): ` +
          `${describeViolations(before)}. Run "pragma foreign_key_check" and repair them.`,
      );
    return applied;
  });
}
