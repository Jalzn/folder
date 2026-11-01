import { AppError } from '@tinyfold/core/application';
import { firstOpenColumn } from '../../domain/columns.js';
import type { TaskAck } from '../../domain/models.js';
import { excerptPresent } from '../../domain/task-source.js';
import { assertVersion, requireActiveProject, requireDocument } from '../helpers.js';
import type { TaskRecord, TaskSourceRecord, WorkspaceContext } from '../ports.js';
import type { CreateTaskInput } from '../schemas/tasks.js';
import { columnFor, completionIn, placeIn, requireTaskLabels, taskAck, taskText } from './task-rules.js';

/**
 * A new task, at the end of its column in the project (the first open column by default), or at the
 * top of the done column, already completed. A copy brings its due date, labels and description.
 */
export function createTask(ctx: WorkspaceContext, input: CreateTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.createTask', input, async (repo) => {
    const id = ctx.newId();
    let projectId = input.projectId ?? undefined;
    let source: TaskSourceRecord | undefined;
    if (input.source) {
      const document = await requireDocument(repo, input.source.documentId);
      if (input.source.expectedVersion !== undefined) assertVersion(document.version, input.source.expectedVersion);
      // A task from an excerpt joins the document's project unless the input names another one.
      projectId ??= document.projectId;
      const blockId = input.source.blockId ?? null;
      if (!excerptPresent(document, blockId, input.source.excerpt))
        throw new AppError(
          'VERSION_CONFLICT',
          'O trecho de origem mudou. Salve o documento e selecione o trecho novamente.',
        );
      source = {
        taskId: id,
        documentId: document.id,
        documentTitle: document.title,
        blockId,
        excerpt: input.source.excerpt,
      };
    }
    // CreateTaskInput lets the project be missing only with a source, whose document has one.
    if (projectId === undefined) throw new AppError('VALIDATION', 'Escolha o projeto da tarefa.');
    const project = await requireActiveProject(repo, projectId);
    const column = await columnFor(repo, input, firstOpenColumn);
    const labels = input.labelIds ? await requireTaskLabels(repo, input.labelIds) : [];
    const now = ctx.now();
    const task: TaskRecord = {
      id,
      ...taskText(input.title, input.description ?? [], ctx.newId),
      projectId: project.id,
      columnId: column.id,
      position: await placeIn(repo, project.id, column, id),
      dueOn: input.dueOn ?? null,
      completedAt: completionIn(column, undefined, now),
      version: 1,
      textVersion: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await repo.insertTask(task);
    if (labels.length) await repo.setTaskLabels(id, labels);
    if (source) await repo.insertSource(source);
    return taskAck(task, await repo.bumpRevision());
  });
}
