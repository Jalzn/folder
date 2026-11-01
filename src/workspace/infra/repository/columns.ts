import { type Database, tables } from '@tinyfold/core/infra';
import type { Kysely } from 'kysely';
import type { ColumnRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';
import { columnModel, columnRow, taskModel } from './mappers.js';
import { expectUpdated } from './versioned-update.js';

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
    async columnTaskCounts() {
      const rows = await db
        .selectFrom('workspace_tasks')
        .select((eb) => ['column_id', eb.fn.countAll<number>().as('count')])
        .where('deleted_at', 'is', null)
        .groupBy('column_id')
        .execute();
      return new Map(rows.map((row) => [row.column_id, row.count]));
    },
    async insertColumn(column) {
      await db.insertInto('workspace_columns').values(columnRow(column)).execute();
    },
    async saveColumn(column, expectedVersion) {
      const result = await db
        .updateTable('workspace_columns')
        .set(columnRow(column))
        .where('id', '=', column.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
    async setColumnPosition(id, position) {
      await db.updateTable('workspace_columns').set({ position }).where('id', '=', id).execute();
    },
    async makeDoneColumn(id, at) {
      await db.updateTable('workspace_columns').set({ is_done: 1, updated_at: at }).where('id', '=', id).execute();
      // The handover trigger completes them at `at` only when it is a new updated_at, and at SQLite's
      // clock otherwise; an injected clock (tests, the sample seed) can repeat one.
      await db.updateTable('workspace_tasks').set({ completed_at: at }).where('column_id', '=', id).execute();
    },
    async tasksOfColumn(columnId) {
      return (
        await db
          .selectFrom('workspace_tasks')
          .selectAll()
          .where('column_id', '=', columnId)
          .orderBy('project_id')
          .orderBy('position')
          .orderBy('id')
          .execute()
      ).map(taskModel);
    },
    async setTaskCompletion(taskId, completedAt) {
      await db.updateTable('workspace_tasks').set({ completed_at: completedAt }).where('id', '=', taskId).execute();
    },
  };
}
