import { tables } from '@tinyfold/core/infra';
import { useTempDatabase } from '@tinyfold/core/testing';
import { sql } from 'kysely';
import { expect, it } from 'vitest';
import { afterKeyset } from './keyset.js';

type Row = { rank: number; edited: string; type: number; id: string };
const temp = useTempDatabase([]);

it('pages every suffix in SQLite order, including mixed directions, full ties and constant type ranks', async () => {
  const db = tables<{ entries: Row }>(temp.db);
  await db.schema
    .createTable('entries')
    .addColumn('rank', 'integer', (column) => column.notNull())
    .addColumn('edited', 'text', (column) => column.notNull())
    .addColumn('type', 'integer', (column) => column.notNull())
    .addColumn('id', 'text', (column) => column.notNull())
    .execute();
  const values: Row[] = [];
  for (const rank of [0, 1])
    for (const edited of ['2026-10-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'])
      for (const type of [0, 1, 2]) for (const id of ["a' OR 1=1 --", 'z']) values.push({ rank, edited, type, id });
  await db.insertInto('entries').values(values).execute();

  for (const descending of [false, true]) {
    const direction = descending ? 'desc' : 'asc';
    const ordered = db
      .selectFrom('entries')
      .selectAll()
      .orderBy('rank')
      .orderBy('edited', direction)
      .orderBy('type')
      .orderBy('id');
    const rows = await ordered.execute();
    for (const [index, cursor] of rows.entries()) {
      const parts = (type: number | undefined) =>
        [
          { expression: sql.ref('rank'), value: cursor.rank, direction: 'asc' },
          { expression: sql.ref('edited'), value: cursor.edited, direction },
          { expression: type === undefined ? sql.ref('type') : sql.val(type), value: cursor.type, direction: 'asc' },
          { expression: sql.ref('id'), value: cursor.id, direction: 'asc' },
        ] as const;
      expect(await ordered.where(afterKeyset(parts(undefined))).execute()).toEqual(rows.slice(index + 1));
      for (const type of [0, 1, 2])
        expect(
          await ordered
            .where('type', '=', type)
            .where(afterKeyset(parts(type)))
            .execute(),
        ).toEqual(rows.slice(index + 1).filter((row) => row.type === type));
    }
  }
});
