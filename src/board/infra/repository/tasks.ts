import { afterKeyset, type Database, tables, versionedUpdate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { BoardExternalPorts } from '../../application/ports/external.js';
import type { TaskRepository } from '../../application/ports/tasks.js';
import { taskFieldsRow, taskModel, taskRow, taskTextRow } from '../sql/mappers.js';
import type { BoardTables } from '../sql/tables.js';
import { overdueOn } from '../sql/task-predicates.js';
import { taskSummaryColumns } from '../sql/tasks.js';

export function taskRepository(
  connection: Database,
  external: Pick<BoardExternalPorts, 'documentsByIds'>,
): TaskRepository {
  const db = tables<BoardTables>(connection);
  return {
    async listTasks(input) {
      let query = db.selectFrom('workspace_tasks').select(taskSummaryColumns).where('deleted_at', 'is', null);
      if (input.projectId) query = query.where('project_id', '=', input.projectId);
      if (input.documentId)
        query = query.where(
          'id',
          'in',
          db.selectFrom('workspace_task_sources').select('task_id').where('document_id', '=', input.documentId),
        );
      return hydrateTasks(db, await query.orderBy('position').orderBy('id').execute(), external);
    },
    async findTask(id) {
      const row = await db.selectFrom('workspace_tasks').selectAll().where('id', '=', id).executeTakeFirst();
      return row && taskModel(row);
    },
    async taskDetail(id) {
      const row = await db.selectFrom('workspace_tasks').selectAll().where('id', '=', id).executeTakeFirst();
      if (!row) return undefined;
      const [task] = await hydrateTasks(db, [row], external);
      const { description, deletedAt } = taskModel(row);
      return task && { ...task, description, deletedAt };
    },
    async insertTask(task) {
      await db.insertInto('workspace_tasks').values(taskRow(task)).execute();
    },
    async saveTaskFields(task, expectedVersion) {
      await versionedUpdate(db.updateTable('workspace_tasks').set(taskFieldsRow(task)), {
        id: task.id,
        expectedVersion: expectedVersion,
        idColumn: 'id',
        versionColumn: 'version',
      });
    },
    async saveTaskText(task, expectedTextVersion) {
      await versionedUpdate(db.updateTable('workspace_tasks').set(taskTextRow(task)), {
        id: task.id,
        expectedVersion: expectedTextVersion,
        idColumn: 'id',
        versionColumn: 'text_version',
      });
    },
    async insertSource(source) {
      await db
        .insertInto('workspace_task_sources')
        .values({
          task_id: source.taskId,
          document_id: source.documentId,
          document_title: source.documentTitle,
          block_id: source.blockId,
          excerpt: source.excerpt,
        })
        .execute();
    },
    async nextPosition({ projectId, columnId }) {
      const row = await db
        .selectFrom('workspace_tasks')
        .select(({ fn }) => fn.max<number>('position').as('position'))
        .where('project_id', '=', projectId)
        .where('column_id', '=', columnId)
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow();
      return (row.position ?? -1) + 1;
    },
    async tasksInColumn({ projectId, columnId }) {
      return (
        await db
          .selectFrom('workspace_tasks')
          .selectAll()
          .where('project_id', '=', projectId)
          .where('column_id', '=', columnId)
          .where('deleted_at', 'is', null)
          .orderBy('position')
          .orderBy('id')
          .execute()
      ).map(taskModel);
    },
    async setTaskPosition(id, position) {
      await db.updateTable('workspace_tasks').set({ position }).where('id', '=', id).execute();
    },
    async boardTasks({ projectId, doneSince }) {
      const rows = await db
        .selectFrom('workspace_tasks as item')
        .innerJoin('workspace_columns as col', 'col.id', 'item.column_id')
        .select(taskSummaryColumns.map((column) => `item.${column}` as const))
        .where('item.project_id', '=', projectId)
        .where('item.deleted_at', 'is', null)
        .where((eb) => eb.or([eb('col.is_done', '=', 0), eb('item.completed_at', '>=', doneSince)]))
        .orderBy('col.position')
        .orderBy('item.position')
        .orderBy('item.id')
        .execute();
      return hydrateTasks(db, rows, external);
    },
    async olderDoneCount({ projectId, doneSince }) {
      const row = await db
        .selectFrom('workspace_tasks')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('project_id', '=', projectId)
        .where('deleted_at', 'is', null)
        .where('completed_at', '<', doneSince)
        .executeTakeFirstOrThrow();
      return row.count;
    },
    async completedTasks(projectId, after, limit) {
      let query = db
        .selectFrom('workspace_tasks')
        .select(taskSummaryColumns)
        .where('project_id', '=', projectId)
        .where('deleted_at', 'is', null)
        .where('completed_at', 'is not', null);
      if (after)
        query = query.where(
          afterKeyset([
            { expression: sql.ref('completed_at'), value: after.completedAt, direction: 'desc' },
            { expression: sql.ref('id'), value: after.id, direction: 'asc' },
          ]),
        );
      const rows = await query.orderBy('completed_at', 'desc').orderBy('id').limit(limit).execute();
      return hydrateTasks(db, rows, external);
    },
    async completedCount(projectId) {
      const row = await db
        .selectFrom('workspace_tasks')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('project_id', '=', projectId)
        .where('deleted_at', 'is', null)
        .where('completed_at', 'is not', null)
        .executeTakeFirstOrThrow();
      return row.count;
    },
    async overdueCounts(today) {
      const rows = await db
        .selectFrom('workspace_tasks')
        .select((eb) => ['project_id', eb.fn.countAll<number>().as('count')])
        .where(overdueOn(today, 'workspace_tasks'))
        .groupBy('project_id')
        .execute();
      return new Map(rows.map((row) => [row.project_id, row.count]));
    },
    async taskLabelIds(taskId) {
      const rows = await db
        .selectFrom('workspace_task_labels')
        .select('label_id')
        .where('task_id', '=', taskId)
        .execute();
      return rows.map((row) => row.label_id);
    },
    async setTaskLabels(taskId, labelIds) {
      // Links to deleted labels stay, so that restoring a label gives it back to this task too.
      let removed = db
        .deleteFrom('workspace_task_labels')
        .where('task_id', '=', taskId)
        .where('label_id', 'in', db.selectFrom('workspace_labels').select('id').where('deleted_at', 'is', null));
      if (labelIds.length) removed = removed.where('label_id', 'not in', [...labelIds]);
      await removed.execute();
      if (labelIds.length)
        await db
          .insertInto('workspace_task_labels')
          .values(labelIds.map((labelId) => ({ task_id: taskId, label_id: labelId })))
          .onConflict((conflict) => conflict.doNothing())
          .execute();
    },
  };
}

import { hydrateTasks } from '../sql/tasks.js';
