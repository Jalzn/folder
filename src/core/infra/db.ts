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

/** Used only by the migration runner while it holds this database's transaction connection. */
export function executeMigrationScript(db: Database, source: string): void {
  const handle = handles.get(db);
  if (!handle) throw new Error('Unknown database handle.');
  handle.exec(source);
}
