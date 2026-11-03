import { type Database, tables, versionedUpdate } from '@tinyfold/core/infra';
import type { ColumnRepository } from '../../application/ports/columns.js';
import { columnModel, columnRow, taskModel } from '../sql/mappers.js';
import type { BoardTables } from '../sql/tables.js';

export function columnRepository(connection: Database): ColumnRepository {
  const db = tables<BoardTables>(connection);
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
      await versionedUpdate(db.updateTable('workspace_columns').set(columnRow(column)), {
        id: column.id,
        expectedVersion: expectedVersion,
        idColumn: 'id',
        versionColumn: 'version',
      });
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
    async setTaskCompletion({ taskId, completedAt }) {
      await db.updateTable('workspace_tasks').set({ completed_at: completedAt }).where('id', '=', taskId).execute();
    },
  };
}

import { activeColumnRows } from '../sql/board.js';
