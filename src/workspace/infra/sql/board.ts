import type { Kysely } from 'kysely';
import type { WorkspaceTables } from './tables.js';

/** The active columns' rows in board order: by position, IDs breaking ties. */
export const activeColumnRows = (db: Kysely<WorkspaceTables>) =>
  db
    .selectFrom('workspace_columns')
    .selectAll()
    .where('deleted_at', 'is', null)
    .orderBy('position')
    .orderBy('id')
    .execute();
