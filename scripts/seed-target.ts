import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import Database from 'better-sqlite3';

/** The system's temporary folders, by their real paths: on macOS, under /private/var/folders and /private/tmp. */
export function temporaryRoots(): string[] {
  const roots = [tmpdir(), '/tmp'].filter((root) => existsSync(root)).map((root) => realpathSync.native(root));
  return [...new Set(roots)];
}

const refused = (message: string) => new Error(message);
const main = 'Defina DATABASE_PATH com um banco temporário. O banco principal nunca recebe o exemplo.';
const inside = (root: string, path: string) => {
  const rest = relative(root, path);
  return rest !== '' && !rest.startsWith('..') && !isAbsolute(rest);
};
/** A checkout's main database, data/tinyfold.sqlite, in any case: APFS ignores it. */
const looksMain = (path: string) =>
  basename(path).toLowerCase() === 'tinyfold.sqlite' && basename(dirname(path)).toLowerCase() === 'data';

/**
 * Refuses a target for `pnpm seed:sample` before anything opens it for writing. The rule is
 * positive: the sample goes only into a new file or an empty database, without any table, inside
 * one of `roots`, the system's temporary folders. The target must not be a symbolic link, and its
 * folder is taken by its real path, so a link, `..` or another letter case cannot lead it to a real
 * database. A checkout's data/tinyfold.sqlite, the container's /data/tinyfold.sqlite, ":memory:"
 * and NODE_ENV=production are refused by name too.
 */
export function assertSeedTarget(path: string, options: { roots: readonly string[]; production: boolean }): void {
  if (options.production) throw refused('O exemplo não roda em produção.');
  if (path === ':memory:') throw refused(main);
  const target = resolve(path);
  if (looksMain(target) || target === '/data/tinyfold.sqlite') throw refused(main);
  if (lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink())
    throw refused('DATABASE_PATH é um link simbólico. Use um arquivo novo para o exemplo.');
  if (!existsSync(dirname(target))) throw refused('A pasta de DATABASE_PATH não existe.');
  const real = join(realpathSync.native(dirname(target)), basename(target));
  if (looksMain(real) || real === '/data/tinyfold.sqlite') throw refused(main);
  if (!options.roots.some((root) => inside(root, real)))
    throw refused(
      `O exemplo só grava na pasta temporária do sistema (${options.roots.join(' ou ')}). ` +
        'Use, por exemplo, DATABASE_PATH="$(mktemp -d)/tinyfold.sqlite".',
    );
  if (!existsSync(real)) return;
  let tables: number;
  let db: Database.Database | undefined;
  try {
    db = new Database(real, { readonly: true, fileMustExist: true });
    tables = (db.prepare("select count(*) as count from sqlite_master where type = 'table'").get() as { count: number })
      .count;
  } catch {
    throw refused('DATABASE_PATH não é um banco SQLite. Use um arquivo novo para o exemplo.');
  } finally {
    db?.close();
  }
  if (tables > 0) throw refused('O banco já tem tabelas. Use um arquivo novo para o exemplo.');
}
