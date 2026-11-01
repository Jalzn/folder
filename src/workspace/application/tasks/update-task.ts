import type { TaskAck } from '../../domain/models.js';
import { assertVersion, projectForEditedItem, requireTask } from '../helpers.js';
import type { TaskRecord, WorkspaceContext } from '../ports.js';
import type { UpdateTaskInput } from '../schemas/tasks.js';
import { columnFor, completionIn, placeIn, requireTaskLabels, taskAck } from './task-rules.js';

/**
 * Changes a task's fields at their version: the column (the done column takes it at the top, any
 * other at the end, decision 13), the project (active, the same column's end there), the due date
 * and the labels, which replace the active set. Only a column or project change moves it on the
 * board, so only that raises the revision (decision 15); the answer carries the revision either way.
 */
export function updateTask(ctx: WorkspaceContext, input: UpdateTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.updateTask', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    const projectId = await projectForEditedItem(repo, task.projectId, input.projectId);
    const column = await columnFor(repo, input, (columns) => columns.find((item) => item.id === task.columnId));
    const labels = input.labelIds ? await requireTaskLabels(repo, input.labelIds) : undefined;
    const moves = column.id !== task.columnId || projectId !== task.projectId;
    const now = ctx.now();
    const saved: TaskRecord = {
      ...task,
      projectId,
      columnId: column.id,
      position: moves ? await placeIn(repo, projectId, column, task.id) : task.position,
      dueOn: input.dueOn === undefined ? task.dueOn : input.dueOn,
      completedAt: completionIn(column, task, now),
      version: task.version + 1,
      updatedAt: now,
    };
    await repo.saveTaskFields(saved, task.version);
    if (labels) await repo.setTaskLabels(task.id, labels);
    // Until B6, the interface of stage 09 renames a task here: a change of the text, with its version.
    if (input.title !== undefined && input.title !== task.title)
      await repo.saveTaskText({ ...saved, title: input.title, textVersion: task.textVersion + 1 }, task.textVersion);
    return taskAck(saved, moves ? await repo.bumpRevision() : await repo.revision());
  });
}
