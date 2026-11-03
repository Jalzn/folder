import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database, writeTransaction } from './db.js';
import { migrate } from './migrate.js';
import { coreModule, defineMigrationModule } from './module.js';
import { idempotentWrite } from './write.js';

const resources: { db: Database; folder?: string }[] = [];
async function fixture() {
  const folder = await mkdtemp(join(tmpdir(), 'tinyfold-core-'));
  const path = join(folder, 'test.sqlite');
  const db = createDatabase(path);
  resources.push({ db, folder });
  await migrate(db, [coreModule]);
  await sql`create table counters (id text primary key, value integer not null)`.execute(db);
  await sql`insert into counters values ('one', 0)`.execute(db);
  return { db, folder, path };
}
afterEach(async () => {
  for (const item of resources.reverse()) {
    await item.db.destroy();
    if (item.folder) await rm(item.folder, { recursive: true, force: true });
  }
  resources.length = 0;
});

describe('SQLite foundation', () => {
  it('reapplies migrations safely and rejects an altered applied migration', async () => {
    const { db, folder } = await fixture();
    expect(await migrate(db, [coreModule])).toEqual([]);
    const file = join(folder, '001_example.sql');
    await writeFile(
      file,
      "create table example (id text primary key); insert into example values ('semicolon;inside');",
    );
    const module = defineMigrationModule({ id: 'example', migrations: pathToFileURL(`${folder}/`) });
    await migrate(db, [module]);
    expect((await sql<{ id: string }>`select id from example`.execute(db)).rows[0]?.id).toBe('semicolon;inside');
    await writeFile(file, `${await readFile(file, 'utf8')}\n-- modified`);
    await expect(migrate(db, [module])).rejects.toThrow('Applied migration changed');
  });

  it('retries concurrent identical writes once, rejecting a reused id with another payload', async () => {
    const { db } = await fixture();
    const input = { requestId: randomUUID(), value: 7 };
    const work = async (trx: Database) => {
      await sql`update counters set value = value + 7 where id = 'one'`.execute(trx);
      return { version: 1, savedAt: 'fixed' };
    };
    const results = await Promise.all(Array.from({ length: 12 }, () => idempotentWrite(db, 'save', input, work)));
    expect(results.every((result) => result.version === 1)).toBe(true);
    expect((await sql<{ value: number }>`select value from counters`.execute(db)).rows[0]?.value).toBe(7);
    const changed = { ...input, value: 99 };
    await expect(idempotentWrite(db, 'save', changed, work)).rejects.toMatchObject({ code: 'REQUEST_REUSED' });
  });

  it('rolls back both work and the retry record on failure', async () => {
    const { db } = await fixture();
    const input = { requestId: randomUUID() };
    await expect(
      idempotentWrite(db, 'broken', input, async (trx) => {
        await sql`update counters set value = 9`.execute(trx);
        throw new Error('failure after update');
      }),
    ).rejects.toThrow('failure after update');
    expect((await sql<{ value: number }>`select value from counters`.execute(db)).rows[0]?.value).toBe(0);
    expect(
      (await sql<{ count: number }>`select count(*) as count from core_mutations`.execute(db)).rows[0]?.count,
    ).toBe(0);
    expect(await idempotentWrite(db, 'broken', input, async () => ({ recovered: true }))).toEqual({ recovered: true });
  });

  it('enforces foreign keys', async () => {
    const { db } = await fixture();
    await sql`create table children (parent_id text references counters(id))`.execute(db);
    await expect(sql`insert into children values ('missing')`.execute(db)).rejects.toThrow();
  });

  it('rejects a contending second writer without partial changes and recovers afterwards', async () => {
    const { db, path } = await fixture();
    const second = createDatabase(path);
    resources.push({ db: second });
    await sql`pragma busy_timeout = 5`.execute(second);
    let entered!: () => void;
    let release!: () => void;
    const enteredPromise = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = writeTransaction(db, async (trx) => {
      await sql`update counters set value = 3`.execute(trx);
      entered();
      await hold;
    });
    await enteredPromise;
    try {
      await expect(
        writeTransaction(second, async (trx) => {
          await sql`update counters set value = 99`.execute(trx);
        }),
      ).rejects.toThrow();
    } finally {
      release();
      await first;
    }
    expect((await sql<{ value: number }>`select value from counters`.execute(second)).rows[0]?.value).toBe(3);
    await writeTransaction(second, async (trx) => {
      await sql`update counters set value = 4`.execute(trx);
    });
    expect((await sql<{ value: number }>`select value from counters`.execute(db)).rows[0]?.value).toBe(4);
  });
});
