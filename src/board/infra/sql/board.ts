import type { Kysely } from 'kysely';
import type { BoardTables } from './tables.js';

/** The active columns' rows in board order: by position, IDs breaking ties. */
export const activeColumnRows = (db: Kysely<BoardTables>) =>
  db
    .selectFrom('workspace_columns')
    .selectAll()
    .where('deleted_at', 'is', null)
    .orderBy('position')
    .orderBy('id')
    .execute();
