import { sql, type UpdateQueryBuilder, type UpdateResult } from 'kysely';
import { versionConflict } from '../../application/version.js';
/** One conditional update, including text versions and aliased filed-item tables. */
export async function versionedUpdate<DB, UT extends keyof DB, TB extends keyof DB>(
  query: UpdateQueryBuilder<DB, UT, TB, UpdateResult>,
  {
    id,
    expectedVersion,
    idColumn = 'id',
    versionColumn = 'version',
  }: { id: string; expectedVersion: number; idColumn?: string; versionColumn?: string },
): Promise<void> {
  const result = await query
    .where(sql.ref(idColumn), '=', id)
    .where(sql.ref(versionColumn), '=', expectedVersion)
    .executeTakeFirstOrThrow();
  if (result.numUpdatedRows !== 1n) throw versionConflict();
}
