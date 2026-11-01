import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import SQLite from 'better-sqlite3';
import {
  CompiledQuery,
  type DatabaseConnection,
  type Driver,
  Kysely,
  SqliteDialect,
  type SqliteDialectConfig,
  SqliteDriver,
  type Transaction,
} from 'kysely';

export type Database = Kysely<object>;
export type DatabaseTransaction = Transaction<object>;
export const tables = <T>(db: Database): Kysely<T> => db as unknown as Kysely<T>;
const handles = new WeakMap<Database, SQLite.Database>();

// Reserve the writer before reading revisions or idempotency records, avoiding deferred lock upgrades.
class ImmediateDriver extends SqliteDriver {
  override async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('begin immediate'));
  }
}

class ImmediateDialect extends SqliteDialect {
  constructor(private readonly settings: SqliteDialectConfig) {
    super(settings);
  }
  override createDriver(): Driver {
    return new ImmediateDriver(this.settings);
  }
}

export function createDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const sqlite = new SQLite(path);
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = FULL');
  const db = new Kysely<object>({ dialect: new ImmediateDialect({ database: sqlite }) });
  handles.set(db, sqlite);
  return db;
}

export function writeTransaction<T>(db: Database, work: (trx: DatabaseTransaction) => Promise<T>): Promise<T> {
  return db.transaction().execute(work);
}

export function readTransaction<T>(db: Database, work: (trx: DatabaseTransaction) => Promise<T>): Promise<T> {
  return db.transaction().execute(work);
}

export async function backupDatabase(db: Database, destination: string): Promise<void> {
  const handle = handles.get(db);
  if (!handle) throw new Error('Unknown database handle.');
  mkdirSync(dirname(resolve(destination)), { recursive: true });
  await handle.backup(destination);
}

function handleOf(db: Database): SQLite.Database {
  const handle = handles.get(db);
  if (!handle) throw new Error('Unknown database handle.');
  return handle;
}

/** Used only by the migration runner while it holds this database's transaction connection. */
export function executeMigrationScript(db: Database, source: string): void {
  handleOf(db).exec(source);
}

/**
 * Turns foreign key enforcement on or off for the connection and confirms it took. SQLite ignores
 * the pragma inside a transaction, so the migration runner calls this outside one.
 */
export function setForeignKeys(db: Database, on: boolean): void {
  const handle = handleOf(db);
  handle.pragma(`foreign_keys = ${on ? 'ON' : 'OFF'}`);
  if (handle.pragma('foreign_keys', { simple: true }) !== (on ? 1 : 0))
    throw new Error(`Foreign keys did not turn ${on ? 'on' : 'off'}.`);
}

/** A row that breaks a foreign key: the table and row, and the table it should refer to. */
export interface ForeignKeyViolation {
  table: string;
  rowid: number | null;
  parent: string;
}

/** Every row of the database that breaks a foreign key, whether enforcement is on or not. */
export function foreignKeyViolations(db: Database): ForeignKeyViolation[] {
  return (handleOf(db).pragma('foreign_key_check') as ForeignKeyViolation[]).map(({ table, rowid, parent }) => ({
    table,
    rowid,
    parent,
  }));
}

/** Registers deterministic SQL functions on the connection, for migrations and queries alike. */
export function registerSqlFunctions(db: Database, functions: Record<string, (value: string) => string>): void {
  const handle = handleOf(db);
  for (const [name, fn] of Object.entries(functions)) handle.function(name, { deterministic: true }, fn);
}
