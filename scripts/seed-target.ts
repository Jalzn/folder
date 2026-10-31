import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';

/** The databases the sample never goes into: the repository's own and the container's production one. */
const realDatabases = (repositoryRoot: string) => [
  resolve(repositoryRoot, 'data/tinyfold.sqlite'),
  '/data/tinyfold.sqlite',
];

const realPath = (file: string) => (existsSync(file) ? realpathSync(file) : resolve(file));

/**
 * Refuses a target for `pnpm seed:sample` before anything opens it for writing, so the seed never
 * migrates a real database nor mixes the sample into one. It takes only a file that does not exist
 * yet or an empty database, without any table; never one in memory, which would keep nothing.
 */
export function assertSeedTarget(path: string, options: { repositoryRoot: string; production: boolean }): void {
  if (options.production) throw new Error('O exemplo não roda em produção.');
  if (path === ':memory:' || realDatabases(options.repositoryRoot).some((file) => realPath(file) === realPath(path)))
    throw new Error('Defina DATABASE_PATH com um banco temporário. O banco principal nunca recebe o exemplo.');
  if (!existsSync(path)) return;
  let tables: number;
  let db: Database.Database | undefined;
  try {
    db = new Database(path, { readonly: true, fileMustExist: true });
    tables = (db.prepare("select count(*) as count from sqlite_master where type = 'table'").get() as { count: number })
      .count;
  } catch {
    throw new Error('DATABASE_PATH não é um banco SQLite. Use um arquivo novo para o exemplo.');
  } finally {
    db?.close();
  }
  if (tables > 0) throw new Error('O banco já tem tabelas. Use um arquivo novo para o exemplo.');
}
