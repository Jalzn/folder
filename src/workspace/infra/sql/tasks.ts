import type { DocumentBlock } from '../../domain/document-models.js';
import { taskLabels } from './task-labels.js';
import { hydrateTaskSource, taskChecklist } from './task-source.js';
export const taskSummaryColumns = [
  'id',
  'title',
  'project_id',
  'column_id',
  'position',
  'version',
  'text_version',
  'due_on',
  'completed_at',
  'checklist_done',
  'checklist_total',
  'created_at',
  'updated_at',
] as const;
export type TaskSummaryRow = Pick<TaskRow, (typeof taskSummaryColumns)[number]>;

import type { Kysely } from 'kysely';
import type { Task } from '../../domain/task-models.js';
import type { TaskRow, WorkspaceTables } from './tables.js';

/** A stored task as lists show it, without its description. */
function taskSummary(task: TaskSummaryRow, extra: Pick<Task, 'labelIds' | 'source'>): Task {
  return {
    id: task.id,
    title: task.title,
    projectId: task.project_id,
    columnId: task.column_id,
    position: task.position,
    version: task.version,
    textVersion: task.text_version,
    dueOn: task.due_on,
    completedAt: task.completed_at,
    checklist: taskChecklist(task),
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    ...extra,
  };
}

/**
 * Attaches each task's labels and source with the current availability of its document and
 * excerpt. A document deleted for good is gone, and the source shows the title it kept.
 */
export async function hydrateTasks(db: Kysely<WorkspaceTables>, rows: TaskSummaryRow[]): Promise<Task[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const sources = await db.selectFrom('workspace_task_sources').selectAll().where('task_id', 'in', ids).execute();
  const documentIds = [...new Set(sources.flatMap((source) => source.document_id ?? []))];
  const documents = documentIds.length
    ? await db
        .selectFrom('workspace_documents')
        .select(['id', 'title', 'deleted_at', 'content', 'plain_text'])
        .where('id', 'in', documentIds)
        .execute()
    : [];
  const labels = await taskLabels(db, ids);
  const sourceMap = new Map(sources.map((source) => [source.task_id, source]));
  const documentMap = new Map(
    documents.map((row) => [
      row.id,
      {
        id: row.id,
        title: row.title,
        deletedAt: row.deleted_at,
        content: JSON.parse(row.content) as DocumentBlock[],
        plainText: row.plain_text,
      },
    ]),
  );
  return rows.map((row) => {
    const task = row;
    const extra = { labelIds: (labels.get(row.id) ?? []).map((label) => label.id) };
    const source = sourceMap.get(row.id);
    if (!source) return taskSummary(task, { ...extra, source: null });
    const document = source.document_id === null ? undefined : documentMap.get(source.document_id);
    return taskSummary(task, {
      ...extra,
      source: hydrateTaskSource(
        {
          documentId: source.document_id,
          keptTitle: source.document_title,
          blockId: source.block_id,
          excerpt: source.excerpt,
          document,
        },
        'owner',
      ),
    });
  });
}
