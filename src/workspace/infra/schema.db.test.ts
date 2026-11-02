import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { expect, it } from 'vitest';
import { workspaceModule } from './module.js';

const kinds = ['table', 'index', 'trigger', 'view'];

/*
 * The schema the migrations leave, readable in one place: the tables of core and the workspace,
 * each with its indexes and triggers. A new migration, or one that rebuilds a table and drops a
 * trigger with it, shows in the diff of schema/current.sql. The file lives outside migrations/,
 * whose runner refuses any file not named NNN_name.sql.
 */
it('leaves the schema of schema/current.sql', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-schema-'));
  const db = createDatabase(join(folder, 'schema.sqlite'));
  try {
    await migrate(db, [coreModule, workspaceModule]);
    const migrations = await sql<{ module: string; version: number; name: string }>`
      select module, version, name from core_schema_migrations order by module, version`.execute(db);
    const objects = await sql<{ type: string; name: string; tbl_name: string; sql: string }>`
      select type, name, tbl_name, sql from sqlite_master
      where name not like 'sqlite_%' and sql is not null`.execute(db);
    const ordered = objects.rows.toSorted(
      (a, b) =>
        a.tbl_name.localeCompare(b.tbl_name, 'en') ||
        kinds.indexOf(a.type) - kinds.indexOf(b.type) ||
        a.name.localeCompare(b.name, 'en'),
    );
    const header = [
      '-- The schema the migrations leave, written by schema.db.test.ts. Do not edit: a migration changes it.',
      ...migrations.rows.map(
        ({ module, version, name }) => `-- ${module} ${String(version).padStart(3, '0')}_${name}.sql`,
      ),
    ].join('\n');
    const schema = [header, ...ordered.map((object) => `${object.sql};`)].join('\n\n');
    await expect(`${schema}\n`).toMatchFileSnapshot('./schema/current.sql');
  } finally {
    await db.destroy();
    await rm(folder, { recursive: true, force: true });
  }
});
