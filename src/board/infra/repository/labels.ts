import { type Database, tables, versionedUpdate } from '@tinyfold/core/infra';
import type { LabelRepository } from '../../application/ports/labels.js';
import { byLabelName } from '../../domain/labels.js';
import { labelModel, labelRow } from '../sql/mappers.js';
import type { BoardTables } from '../sql/tables.js';

export function labelRepository(connection: Database): LabelRepository {
  const db = tables<BoardTables>(connection);
  const liveLinks = () =>
    db
      .selectFrom('workspace_task_labels as link')
      .innerJoin('workspace_tasks as task', 'task.id', 'link.task_id')
      .where('task.deleted_at', 'is', null);
  return {
    async findLabels(ids) {
      if (!ids.length) return [];
      return (
        await db
          .selectFrom('workspace_labels')
          .selectAll()
          .where('id', 'in', [...ids])
          .execute()
      ).map(labelModel);
    },
    async findLabel(id) {
      const row = await db.selectFrom('workspace_labels').selectAll().where('id', '=', id).executeTakeFirst();
      return row && labelModel(row);
    },
    async activeLabels() {
      const rows = await db.selectFrom('workspace_labels').selectAll().where('deleted_at', 'is', null).execute();
      return rows.map(labelModel).sort(byLabelName);
    },
    async labelSummaries() {
      const [labels, counts] = [
        await db
          .selectFrom('workspace_labels')
          .select(['id', 'name', 'color', 'version'])
          .where('deleted_at', 'is', null)
          .execute(),
        await liveLinks()
          .select((eb) => ['link.label_id', eb.fn.countAll<number>().as('count')])
          .groupBy('link.label_id')
          .execute(),
      ];
      const countOf = new Map(counts.map((row) => [row.label_id, row.count]));
      return labels.sort(byLabelName).map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
        version: label.version,
        taskCount: countOf.get(label.id) ?? 0,
      }));
    },
    async liveTasksWithLabel(labelId) {
      const row = await liveLinks()
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('link.label_id', '=', labelId)
        .executeTakeFirstOrThrow();
      return row.count;
    },
    async unlinkTasksAtLimit(labelId, limit) {
      // The tasks linked to the label, live and trashed, that already have `limit` active labels.
      const full = db
        .selectFrom('workspace_task_labels as link')
        .innerJoin('workspace_labels as label', 'label.id', 'link.label_id')
        .select('link.task_id')
        .where('label.deleted_at', 'is', null)
        .where('link.task_id', 'in', (eb) =>
          eb.selectFrom('workspace_task_labels').select('task_id').where('label_id', '=', labelId),
        )
        .groupBy('link.task_id')
        .having((eb) => eb.fn.countAll(), '>=', limit);
      const result = await db
        .deleteFrom('workspace_task_labels')
        .where('label_id', '=', labelId)
        .where('task_id', 'in', full)
        .executeTakeFirst();
      return Number(result.numDeletedRows);
    },
    async insertLabel(label) {
      await db.insertInto('workspace_labels').values(labelRow(label)).execute();
    },
    async saveLabel(label, expectedVersion) {
      await versionedUpdate(db.updateTable('workspace_labels').set(labelRow(label)), {
        id: label.id,
        expectedVersion,
      });
    },
  };
}
