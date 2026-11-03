import { firstOpenColumn } from '../../domain/columns.js';
import type { TaskAck } from '../../domain/task-models.js';
import { boardErrors } from '../errors.js';
import type { BoardContext } from '../ports/context.js';
import type { TaskRecord, TaskSourceRecord } from '../ports/tasks.js';
import { requireActiveProject } from '../project-access.js';
import type { CreateTaskInput } from '../schemas/tasks.js';
import { columnFor, completionIn, placeIn, requireTaskLabels, taskAck, taskText } from './task-rules.js';

/**
 * A new task, at the end of its column in the project (the first open column by default), or at the
 * top of the done column, already completed. A copy brings its due date, labels and description.
 */
export function createTask(ctx: BoardContext, input: CreateTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.createTask', input, async (repo) => {
    const id = ctx.newId();
    let projectId = input.projectId ?? undefined;
    let source: TaskSourceRecord | undefined;
    if (input.source) {
      const resolved = await repo.resolveTaskSource(input.source);
      // A task from an excerpt joins the document's project unless the input names another one.
      projectId ??= resolved.projectId;
      source = {
        taskId: id,
        documentId: resolved.documentId,
        documentTitle: resolved.documentTitle,
        blockId: resolved.blockId,
        excerpt: resolved.excerpt,
      };
    }
    // CreateTaskInput lets the project be missing only with a source, whose document has one.
    if (projectId === undefined) throw boardErrors.taskProjectRequired();
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
