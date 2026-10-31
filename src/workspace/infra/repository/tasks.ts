import { AppError } from '@tinyfold/core/application';
import { type Database, tables } from '@tinyfold/core/infra';
import type { Kysely } from 'kysely';
import type { TaskRepository } from '../../application/ports.js';
import type { Task } from '../../domain/models.js';
import { excerptPresent } from '../../domain/task-source.js';
import type { TaskRow, WorkspaceTables } from '../db.js';
import { documentModel, taskModel, taskRow } from './mappers.js';
import { expectUpdated } from './versioned-update.js';

/** Attaches each task's source with the current availability of its document and excerpt. */
async function hydrateTasks(db: Kysely<WorkspaceTables>, rows: TaskRow[]): Promise<Task[]> {
  if (!rows.length) return [];
  const sources = await db
    .selectFrom('workspace_task_sources')
    .selectAll()
    .where(
      'task_id',
      'in',
      rows.map((row) => row.id),
    )
    .execute();
  const documentIds = [...new Set(sources.map((source) => source.document_id))];
  const documents = documentIds.length
    ? await db.selectFrom('workspace_documents').selectAll().where('id', 'in', documentIds).execute()
    : [];
  const sourceMap = new Map(sources.map((source) => [source.task_id, source]));
  const documentMap = new Map(documents.map((row) => [row.id, documentModel(row)]));
  return rows.map((row) => {
    const { deletedAt: _, ...task } = taskModel(row);
    const source = sourceMap.get(row.id);
    if (!source) return { ...task, source: null };
    const document = documentMap.get(source.document_id);
    const available = Boolean(document && !document.deletedAt);
    return {
      ...task,
      source: {
        documentId: source.document_id,
        blockId: source.block_id,
        excerpt: source.excerpt,
        documentTitle: document?.title ?? 'Documento indisponível',
        available,
        blockAvailable: Boolean(available && document && excerptPresent(document, source.block_id, source.excerpt)),
      },
    };
  });
}

export function taskRepository(connection: Database): TaskRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async listTasks(input) {
      let query = db.selectFrom('workspace_tasks').selectAll().where('deleted_at', 'is', null);
      if (input.projectId !== undefined)
        query =
          input.projectId === null
            ? query.where('project_id', 'is', null)
            : query.where('project_id', '=', input.projectId);
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
    async taskView(id) {
      const row = await db
        .selectFrom('workspace_tasks')
        .selectAll()
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow();
      const [task] = await hydrateTasks(db, [row]);
      if (!task) throw new AppError('NOT_FOUND', 'A tarefa não foi encontrada.');
      return task;
    },
    async insertTask(task) {
      await db.insertInto('workspace_tasks').values(taskRow(task)).execute();
    },
    async saveTask(task, expectedVersion) {
      const result = await db
        .updateTable('workspace_tasks')
        .set(taskRow(task))
        .where('id', '=', task.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
    async insertSource(source) {
      await db
        .insertInto('workspace_task_sources')
        .values({
          task_id: source.taskId,
          document_id: source.documentId,
          block_id: source.blockId,
          excerpt: source.excerpt,
        })
        .execute();
    },
    async nextPosition(status) {
      const row = await db
        .selectFrom('workspace_tasks')
        .select(({ fn }) => fn.max<number>('position').as('position'))
        .where('status', '=', status)
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow();
      return (row.position ?? -1) + 1;
    },
    async tasksInColumn(status) {
      return (
        await db
          .selectFrom('workspace_tasks')
          .selectAll()
          .where('status', '=', status)
          .where('deleted_at', 'is', null)
          .orderBy('position')
          .orderBy('id')
          .execute()
      ).map(taskModel);
    },
  };
}
