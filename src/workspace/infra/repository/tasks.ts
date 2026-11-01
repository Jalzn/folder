import { type Database, tables } from '@tinyfold/core/infra';
import type { Kysely } from 'kysely';
import type { TaskRecord, TaskRepository } from '../../application/ports.js';
import { byLabelName } from '../../domain/labels.js';
import type { Task } from '../../domain/models.js';
import { excerptPresent } from '../../domain/task-source.js';
import { statusOfColumn } from '../../domain/task-status.js';
import type { TaskRow, WorkspaceTables } from '../db.js';
import { activeColumnRows } from './columns.js';
import { columnModel, documentModel, taskFieldsRow, taskModel, taskRow, taskTextRow } from './mappers.js';
import { expectUpdated } from './versioned-update.js';

/** The active labels of each task, in alphabetical order: links to deleted labels stay hidden. */
export async function activeLabelIds(db: Kysely<WorkspaceTables>, taskIds: readonly string[]) {
  const byTask = new Map<string, string[]>();
  if (!taskIds.length) return byTask;
  const rows = await db
    .selectFrom('workspace_task_labels as link')
    .innerJoin('workspace_labels as label', 'label.id', 'link.label_id')
    .select(['link.task_id', 'label.id', 'label.name'])
    .where('link.task_id', 'in', taskIds)
    .where('label.deleted_at', 'is', null)
    .execute();
  for (const row of [...rows].sort(byLabelName)) byTask.set(row.task_id, [...(byTask.get(row.task_id) ?? []), row.id]);
  return byTask;
}

/** A stored task as lists show it, without its description. */
export function taskSummary(task: TaskRecord, extra: Pick<Task, 'labelIds' | 'source' | 'status'>): Task {
  return {
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    columnId: task.columnId,
    position: task.position,
    version: task.version,
    textVersion: task.textVersion,
    dueOn: task.dueOn,
    completedAt: task.completedAt,
    checklist: task.checklistTotal ? { done: task.checklistDone, total: task.checklistTotal } : null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    ...extra,
  };
}

/**
 * Attaches each task's labels and source with the current availability of its document and
 * excerpt. A document deleted for good is gone, and the source shows the title it kept.
 */
export async function hydrateTasks(db: Kysely<WorkspaceTables>, rows: TaskRow[]): Promise<Task[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const sources = await db.selectFrom('workspace_task_sources').selectAll().where('task_id', 'in', ids).execute();
  const documentIds = [...new Set(sources.flatMap((source) => source.document_id ?? []))];
  const documents = documentIds.length
    ? await db.selectFrom('workspace_documents').selectAll().where('id', 'in', documentIds).execute()
    : [];
  const [labels, columns] = [await activeLabelIds(db, ids), (await activeColumnRows(db)).map(columnModel)];
  const sourceMap = new Map(sources.map((source) => [source.task_id, source]));
  const documentMap = new Map(documents.map((row) => [row.id, documentModel(row)]));
  return rows.map((row) => {
    const task = taskModel(row);
    const extra = { labelIds: labels.get(row.id) ?? [], status: statusOfColumn(columns, row.column_id) };
    const source = sourceMap.get(row.id);
    if (!source) return taskSummary(task, { ...extra, source: null });
    const document = source.document_id === null ? undefined : documentMap.get(source.document_id);
    const available = Boolean(document && !document.deletedAt);
    return taskSummary(task, {
      ...extra,
      source: {
        documentId: source.document_id,
        blockId: source.block_id,
        excerpt: source.excerpt,
        documentTitle: document?.title ?? source.document_title,
        available,
        blockAvailable: Boolean(available && document && excerptPresent(document, source.block_id, source.excerpt)),
      },
    });
  });
}

export function taskRepository(connection: Database): TaskRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async listTasks(input) {
      let query = db.selectFrom('workspace_tasks').selectAll().where('deleted_at', 'is', null);
      if (input.projectId) query = query.where('project_id', '=', input.projectId);
      if (input.documentId)
        query = query.where(
          'id',
          'in',
          db.selectFrom('workspace_task_sources').select('task_id').where('document_id', '=', input.documentId),
        );
      return hydrateTasks(db, await query.orderBy('position').orderBy('id').execute());
    },
    async findTask(id) {
      const row = await db.selectFrom('workspace_tasks').selectAll().where('id', '=', id).executeTakeFirst();
      return row && taskModel(row);
    },
    async taskDetail(id) {
      const row = await db.selectFrom('workspace_tasks').selectAll().where('id', '=', id).executeTakeFirst();
      if (!row) return undefined;
      const [task] = await hydrateTasks(db, [row]);
      const { description, deletedAt } = taskModel(row);
      return task && { ...task, description, deletedAt };
    },
    async insertTask(task) {
      await db.insertInto('workspace_tasks').values(taskRow(task)).execute();
    },
    async saveTaskFields(task, expectedVersion) {
      const result = await db
        .updateTable('workspace_tasks')
        .set(taskFieldsRow(task))
        .where('id', '=', task.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
    async saveTaskText(task, expectedTextVersion) {
      const result = await db
        .updateTable('workspace_tasks')
        .set(taskTextRow(task))
        .where('id', '=', task.id)
        .where('text_version', '=', expectedTextVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
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
    async nextPosition(projectId, columnId) {
      const row = await db
        .selectFrom('workspace_tasks')
        .select(({ fn }) => fn.max<number>('position').as('position'))
        .where('project_id', '=', projectId)
        .where('column_id', '=', columnId)
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow();
      return (row.position ?? -1) + 1;
    },
    async tasksInColumn(projectId, columnId) {
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
