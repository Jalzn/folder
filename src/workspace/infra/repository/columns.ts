import { type Database, tables } from '@tinyfold/core/infra';
import type { Kysely } from 'kysely';
import type { ColumnRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';
import { columnModel } from './mappers.js';

/** The active columns' rows in board order: by position, IDs breaking ties. */
export const activeColumnRows = (db: Kysely<WorkspaceTables>) =>
  db
    .selectFrom('workspace_columns')
    .selectAll()
    .where('deleted_at', 'is', null)
    .orderBy('position')
    .orderBy('id')
    .execute();

export function columnRepository(connection: Database): ColumnRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async activeColumns() {
      return (await activeColumnRows(db)).map(columnModel);
    },
    async findColumn(id) {
      const row = await db.selectFrom('workspace_columns').selectAll().where('id', '=', id).executeTakeFirst();
      return row && columnModel(row);
    },
  };
}
