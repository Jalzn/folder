import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from './db.js';
import { migrate } from './migrate.js';
import { coreModule, defineMigrationModule, type MigrationModuleDefinition } from './module.js';

const resources: { db: Database; folder: string }[] = [];
afterEach(async () => {
  for (const item of resources.reverse()) {
    await item.db.destroy();
    await rm(item.folder, { recursive: true, force: true });
  }
  resources.length = 0;
});

/** A database and a module whose migrations are the given files, written as they come. */
async function fixture(sqlFunctions?: MigrationModuleDefinition['sqlFunctions']) {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-migrate-'));
  const migrations = join(folder, 'migrations');
  await mkdir(migrations);
  const db = createDatabase(join(folder, 'test.sqlite'));
  resources.push({ db, folder });
  const module = defineMigrationModule({
    id: 'example',
    migrations: pathToFileURL(`${migrations}/`),
    ...(sqlFunctions ? { sqlFunctions } : {}),
  });
  const write = (name: string, source: string) => writeFile(join(migrations, name), source);
  const rows = async <T>(query: string) => (await sql.raw<T>(query).execute(db)).rows;
  const foreignKeys = async () => (await rows<{ foreign_keys: number }>('pragma foreign_keys'))[0]?.foreign_keys;
  return { db, module, write, rows, foreignKeys };
}

const parentAndChild = `create table parent (id text primary key, name text not null);
create table child (id text primary key, parent_id text not null references parent(id) on delete cascade);
insert into parent values ('p1', 'um'), ('p2', 'dois');
insert into child values ('c1', 'p1'), ('c2', 'p2');`;

/** Rebuilds `parent` as the SQLite 12-step procedure does, keeping `only` of its rows. */
const rebuildParent = (only = "('p1', 'p2')", drop = 'drop table parent;') => `
create table parent_new (id text primary key, name text not null, note text not null default '');
insert into parent_new (id, name) select id, name from parent where id in ${only};
${drop}
alter table parent_new rename to parent;`;

describe('migration runner', () => {
  it('rebuilds a referenced table with the keys off, keeps the rows that refer to it, and turns the keys back on', async () => {
    const { db, module, write, rows, foreignKeys } = await fixture();
    await write('001_tables.sql', parentAndChild);
    await write('002_rebuild.sql', rebuildParent());
    expect(await migrate(db, [coreModule, module])).toEqual([
      { module: 'core', version: 1, name: 'core' },
      { module: 'example', version: 1, name: 'tables' },
      { module: 'example', version: 2, name: 'rebuild' },
    ]);
    // With the keys on, dropping parent would have deleted every child by cascade.
    expect(await rows('select id, parent_id from child order by id')).toEqual([
      { id: 'c1', parent_id: 'p1' },
      { id: 'c2', parent_id: 'p2' },
    ]);
    expect(await rows("select name from parent where id = 'p1'")).toEqual([{ name: 'um' }]);
    expect(await foreignKeys()).toBe(1);
    expect(await migrate(db, [coreModule, module])).toEqual([]);
    expect(await foreignKeys()).toBe(1);
  });

  it('refuses a migration that leaves an orphan: nothing is applied and the keys come back on', async () => {
    const { db, module, write, rows, foreignKeys } = await fixture();
    await write('001_tables.sql', parentAndChild);
    await migrate(db, [coreModule, module]);
    await write('002_rebuild.sql', rebuildParent("('p1')"));
    await write('003_more.sql', 'create table later (id text primary key);');
    await expect(migrate(db, [coreModule, module])).rejects.toThrow(
      'Foreign key check failed after the migrations: child row 2 -> parent.',
    );
    expect(await rows('select id from parent order by id')).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    expect(await rows("select name from sqlite_master where name in ('later', 'parent_new')")).toEqual([]);
    expect(await rows("select version from core_schema_migrations where module = 'example'")).toEqual([{ version: 1 }]);
    expect(await foreignKeys()).toBe(1);
    // A failing statement also gives the keys back.
    await write('002_rebuild.sql', 'create table broken (;');
    await expect(migrate(db, [coreModule, module])).rejects.toThrow();
    expect(await foreignKeys()).toBe(1);
  });

  it('leaves violations from before the migrations as they were, with a warning, and refuses only new ones', async () => {
    const { db, module, write, rows, foreignKeys } = await fixture();
    await write('001_tables.sql', parentAndChild);
    await migrate(db, [coreModule, module]);
    // An orphan left by manual SQL with the keys off, long before the upgrade.
    await sql`pragma foreign_keys = off`.execute(db);
    await sql`insert into child values ('c0', 'gone')`.execute(db);
    await sql`pragma foreign_keys = on`.execute(db);
    const warnings: string[] = [];
    const warn = (message: string) => warnings.push(message);

    await write('002_rebuild.sql', rebuildParent("('p1')"));
    await expect(migrate(db, [coreModule, module], { warn })).rejects.toThrow(
      'Foreign key check failed after the migrations: child row 2 -> parent.',
    );
    expect(await rows("select version from core_schema_migrations where module = 'example'")).toEqual([{ version: 1 }]);
    expect(warnings).toEqual([]);

    await write('002_rebuild.sql', rebuildParent());
    expect(await migrate(db, [coreModule, module], { warn })).toEqual([
      { module: 'example', version: 2, name: 'rebuild' },
    ]);
    expect(warnings).toEqual([
      'Foreign key violations from before the migrations, left as they were (1): child row 3 -> parent. ' +
        'Run "pragma foreign_key_check" and repair them.',
    ]);
    expect(await rows("select id, parent_id from child where id = 'c0'")).toEqual([{ id: 'c0', parent_id: 'gone' }]);
    expect(await foreignKeys()).toBe(1);
  });

  it('rebuilds with the keys off whatever way the table is named in DROP TABLE', async () => {
    // The forms a scan of the text missed: quoted and bracketed names with their schema, single
    // quotes, and comment markers inside a string before the drop.
    for (const drop of [
      'drop table "main"."parent";',
      'drop table [main].[parent];',
      "drop table 'parent';",
      "select '--', '/*'; drop table parent;",
      'DROP\nTABLE IF EXISTS main.parent;',
    ]) {
      const { db, module, write, rows, foreignKeys } = await fixture();
      await write('001_tables.sql', parentAndChild);
      await write('002_rebuild.sql', rebuildParent(undefined, drop));
      expect(await migrate(db, [coreModule, module]), drop).toHaveLength(3);
      expect(await rows('select id from child order by id'), drop).toEqual([{ id: 'c1' }, { id: 'c2' }]);
      expect(await foreignKeys()).toBe(1);
    }
  });

  it('refuses a migration that counts on a cascade or leaves a reference unchecked, since none fires inside one', async () => {
    const { db, module, write, rows, foreignKeys } = await fixture();
    await write('001_tables.sql', parentAndChild);
    await migrate(db, [coreModule, module]);
    // With the keys on, deleting p2 would have deleted c2 by cascade; with them off, c2 is an orphan.
    await write('002_prune.sql', "delete from parent where id = 'p2';");
    await expect(migrate(db, [coreModule, module])).rejects.toThrow(
      'Foreign key check failed after the migrations: child row 2 -> parent.',
    );
    expect(await rows('select id from parent order by id')).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    expect(await foreignKeys()).toBe(1);
    // The migration has to delete the children itself.
    await write('002_prune.sql', "delete from child where parent_id = 'p2'; delete from parent where id = 'p2';");
    expect(await migrate(db, [coreModule, module])).toEqual([{ module: 'example', version: 2, name: 'prune' }]);
    // Nor is a reference checked when it is written: the check before the commit finds it.
    await write('003_orphan.sql', "insert into child values ('c3', 'missing');");
    await expect(migrate(db, [coreModule, module])).rejects.toThrow(
      'Foreign key check failed after the migrations: child row 2 -> parent.',
    );
    expect(await rows('select id from child order by id')).toEqual([{ id: 'c1' }]);
    expect(await foreignKeys()).toBe(1);
  });

  it('registers the modules’ SQL functions before the first migration, and keeps them', async () => {
    const { db, module, write, rows } = await fixture({ example_shout: (value) => `${value.toUpperCase()}!` });
    await write(
      '001_tables.sql',
      "create table said (text text not null); insert into said values (example_shout('oi'));",
    );
    await migrate(db, [coreModule, module]);
    expect(await rows('select text from said')).toEqual([{ text: 'OI!' }]);
    expect(await rows("select example_shout('tchau') as text")).toEqual([{ text: 'TCHAU!' }]);
  });
});
