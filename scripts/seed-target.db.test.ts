import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSeedTarget } from './seed-target.js';

describe('seed target', () => {
  let directory: string;
  // A repository root of its own, so the test never looks at the real data/tinyfold.sqlite.
  const target =
    (path: string, production = false) =>
    () =>
      assertSeedTarget(path, { repositoryRoot: directory, production });
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-seed-target-'));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('takes a file that does not exist yet, or an empty database', async () => {
    expect(target(join(directory, 'novo.sqlite'))).not.toThrow();
    await writeFile(join(directory, 'vazio.sqlite'), '');
    expect(target(join(directory, 'vazio.sqlite'))).not.toThrow();
    new Database(join(directory, 'sem-tabelas.sqlite')).close();
    expect(target(join(directory, 'sem-tabelas.sqlite'))).not.toThrow();
  });

  it('refuses the main and production databases, memory and production mode, without opening them', () => {
    for (const path of [join(directory, 'data/tinyfold.sqlite'), '/data/tinyfold.sqlite', ':memory:'])
      expect(target(path)).toThrow('O banco principal nunca recebe o exemplo.');
    expect(target(join(directory, 'novo.sqlite'), true)).toThrow('O exemplo não roda em produção.');
  });

  it('refuses, unchanged, a database with any table and a file that is not a database', async () => {
    const real = join(directory, 'real.sqlite');
    const db = new Database(real);
    db.exec("CREATE TABLE workspace_tasks (title TEXT); INSERT INTO workspace_tasks VALUES ('Tarefa real')");
    db.close();
    const before = await readFile(real);
    expect(target(real)).toThrow('O banco já tem tabelas.');
    expect(await readFile(real)).toEqual(before);
    await writeFile(join(directory, 'notas.txt'), 'não sou um banco de dados, mas tenho bytes suficientes');
    expect(target(join(directory, 'notas.txt'))).toThrow('não é um banco SQLite');
  });
});
