import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { sql } from 'kysely';
import {
  type Database,
  type DatabaseTransaction,
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
 * The line a migration that rebuilds a table other tables refer to carries in its leading comments.
 * Inside a transaction SQLite ignores `PRAGMA foreign_keys`, and dropping a referenced table with the
 * keys on would delete or refuse the rows that point at it. The line is part of the file, and of its
 * checksum.
 */
export const FOREIGN_KEYS_OFF = '-- migrate: foreign_keys off';

const directive = /^--\s*migrate:\s*foreign_keys\s+off$/iu;

/**
 * Whether the directive is in the comment block that opens the file: any of its `--` lines, in any
 * case, after blank lines or other comments. A directive after the first statement does not count.
 */
function needsForeignKeysOff(source: string): boolean {
  for (const raw of source.split(/\r?\n/u)) {
    const line = raw.trim();
    if (directive.test(line)) return true;
    if (line && !line.startsWith('--')) return false;
  }
  return false;
}

/** The tables a migration drops, read from its text without comments; names are compared lowercased. */
function droppedTables(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/--[^\n]*/gu, ' ');
  const drops = code.matchAll(/\bdrop\s+table\s+(?:if\s+exists\s+)?(?:(?:main|temp)\s*\.\s*)?["`[]?([\w$]+)["`\]]?/giu);
  return [...drops].flatMap((match) => (match[1] ? [match[1].toLowerCase()] : []));
}

/**
 * Refuses a migration without the directive that drops a table another table refers to: with the
 * keys on, the drop would delete the rows pointing at it by cascade, in silence. Tables the same
 * migration also drops do not count.
 */
async function assertNoUnguardedRebuild(trx: DatabaseTransaction, file: MigrationFile): Promise<void> {
  const dropped = new Set(droppedTables(file.source));
  if (!dropped.size) return;
  const references = await sql<{ child: string; parent: string }>`select m.name as child, f."table" as parent
    from sqlite_master m, pragma_foreign_key_list(m.name) f
    where m.type = 'table'`.execute(trx);
  const blocking = references.rows.filter(
    (row) =>
      dropped.has(row.parent.toLowerCase()) &&
      !dropped.has(row.child.toLowerCase()) &&
      row.child.toLowerCase() !== row.parent.toLowerCase(),
  );
  if (blocking.length) {
    const tables = [...new Set(blocking.map((row) => `${row.parent} (referenced by ${row.child})`))].join(', ');
    throw new Error(
      `Migration drops ${tables} with the foreign keys on: ${file.module}/${file.version}. ` +
        `Put "${FOREIGN_KEYS_OFF}" in its leading comments.`,
    );
  }
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
 * FOREIGN_KEYS_OFF, the keys go off on the connection before the transaction, and `foreign_key_check`
 * before the commit must find no violation that was not there when the transaction began (any new
 * row aborts it, and nothing is applied). Older ones, left by manual SQL, do not block the upgrade:
 * they go to `warn`, with their table and rowid. The keys go back on afterwards, also on failure; if
 * they do not, the runner throws and the server does not start. A migration without the line runs
 * with the keys on, as always.
 */
export async function migrate(
  db: Database,
  modules: readonly ModuleDefinition[],
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
    return await applyPending(db, available, keysOff, warn);
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
  warn: (message: string) => void,
): Promise<AppliedMigration[]> {
  return writeTransaction(db, async (trx) => {
    const before = keysOff ? foreignKeyViolations(db) : [];
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
        if (!file.foreignKeysOff) await assertNoUnguardedRebuild(trx, file);
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
      const violations = newViolations(before, foreignKeyViolations(db));
      if (violations.length)
        throw new Error(`Foreign key check failed after the migrations: ${describeViolations(violations)}.`);
      if (before.length)
        warn(
          `Foreign key violations from before the migrations, left as they were (${before.length}): ` +
            `${describeViolations(before)}. Run "pragma foreign_key_check" and repair them.`,
        );
    }
    return applied;
  });
}
