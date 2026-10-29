import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { sql } from 'kysely';
import { type Database, executeMigrationScript, tables, writeTransaction } from './db.js';
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

export async function migrate(db: Database, modules: readonly ModuleDefinition[]): Promise<AppliedMigration[]> {
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
  return writeTransaction(db, async (trx) => {
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
    return applied;
  });
}
