import { mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSeedTarget, temporaryRoots } from './seed-target.js';

describe('seed target', () => {
  // `inside` plays the system's temporary folder; `outside` is any other place, such as a checkout.
  let directory: string;
  let inside: string;
  let outside: string;
  const target =
    (path: string, production = false) =>
    () =>
      assertSeedTarget(path, { roots: [inside], production });
  const main = 'O banco principal nunca recebe o exemplo.';
  beforeEach(async () => {
    directory = realpathSync.native(await mkdtemp(join(tmpdir(), 'tinyfold-seed-target-')));
    inside = join(directory, 'tmp');
    outside = join(directory, 'checkout');
    mkdirSync(inside);
    mkdirSync(join(outside, 'data'), { recursive: true });
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('takes the real temporary folders of the system', () => {
    expect(temporaryRoots()).toContain(realpathSync.native(tmpdir()));
  });

  it('takes a new file or an empty database inside the temporary folder', async () => {
    expect(target(join(inside, 'novo.sqlite'))).not.toThrow();
    await writeFile(join(inside, 'vazio.sqlite'), '');
    expect(target(join(inside, 'vazio.sqlite'))).not.toThrow();
    new Database(join(inside, 'sem-tabelas.sqlite')).close();
    expect(target(join(inside, 'sem-tabelas.sqlite'))).not.toThrow();
  });

  it('refuses any place outside the temporary folder, however the path gets there', () => {
    const outsideOnly = 'O exemplo só grava na pasta temporária do sistema';
    expect(target(join(outside, 'novo.sqlite'))).toThrow(outsideOnly);
    expect(target(join(inside, '..', 'checkout', 'novo.sqlite'))).toThrow(outsideOnly);
    // A folder link that leads out is followed to its real place.
    symlinkSync(outside, join(inside, 'atalho'));
    expect(target(join(inside, 'atalho', 'novo.sqlite'))).toThrow(outsideOnly);
    expect(target(join(inside, 'falta', 'novo.sqlite'))).toThrow('A pasta de DATABASE_PATH não existe.');
  });

  it('refuses a link as the target, even one that leads nowhere yet', () => {
    symlinkSync(join(outside, 'data', 'tinyfold.sqlite'), join(inside, 'quebrado.sqlite'));
    expect(target(join(inside, 'quebrado.sqlite'))).toThrow('DATABASE_PATH é um link simbólico.');
  });

  it('refuses a data/tinyfold.sqlite in any letter case, the production database, memory and production mode', () => {
    mkdirSync(join(inside, 'DATA'));
    for (const path of [
      join(outside, 'data', 'tinyfold.sqlite'),
      join(inside, 'DATA', 'Tinyfold.sqlite'),
      '/data/tinyfold.sqlite',
      ':memory:',
    ])
      expect(target(path)).toThrow(main);
    expect(target(join(inside, 'novo.sqlite'), true)).toThrow('O exemplo não roda em produção.');
  });

  it('refuses, unchanged, a database with any table and a file that is not a database', async () => {
    const real = join(inside, 'real.sqlite');
    const db = new Database(real);
    db.exec("CREATE TABLE workspace_tasks (title TEXT); INSERT INTO workspace_tasks VALUES ('Tarefa real')");
    db.close();
    const before = await readFile(real);
    expect(target(real)).toThrow('O banco já tem tabelas.');
    expect(await readFile(real)).toEqual(before);
    await writeFile(join(inside, 'notas.txt'), 'não sou um banco de dados, mas tenho bytes suficientes');
    expect(target(join(inside, 'notas.txt'))).toThrow('não é um banco SQLite');
  });
});
