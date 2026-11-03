import type { Kysely } from 'kysely';
import type { TaskLabel } from '../../application/reading/read-models.js';
import { byLabelName } from '../../domain/labels.js';
import type { WorkspaceTables } from './tables.js';

/** The active labels of the tasks, in alphabetical order: links to deleted labels stay hidden. */
export async function taskLabels(db: Kysely<WorkspaceTables>, taskIds: readonly string[]) {
  const byTask = new Map<string, TaskLabel[]>();
  if (!taskIds.length) return byTask;
  const rows = await db
    .selectFrom('workspace_task_labels as link')
    .innerJoin('workspace_labels as label', 'label.id', 'link.label_id')
    .select(['link.task_id', 'label.id', 'label.name', 'label.color'])
    .where('link.task_id', 'in', taskIds)
    .where('label.deleted_at', 'is', null)
    .execute();
  for (const row of [...rows].sort(byLabelName))
    byTask.set(row.task_id, [...(byTask.get(row.task_id) ?? []), { id: row.id, name: row.name, color: row.color }]);
  return byTask;
}
