import { assertVersion } from '@tinyfold/core/application';
import type { TaskAck } from '../../domain/task-models.js';
import type { BoardContext, BoardRepositories } from '../ports/context.js';
import type { TaskRecord } from '../ports/tasks.js';
import { projectForEditedItem } from '../project-access.js';
import type { UpdateTaskInput } from '../schemas/tasks.js';
import { requireTask } from './task-lookups.js';
import { columnFor, completionIn, placeIn, requireTaskLabels, taskAck } from './task-rules.js';

/** Whether `labels`, when sent, are the task's active labels already, in any order. */
async function sameLabels(repo: BoardRepositories, taskId: string, labels: readonly string[] | undefined) {
  if (!labels) return true;
  const active = new Set((await repo.activeLabels()).map((label) => label.id));
  const current = (await repo.taskLabelIds(taskId)).filter((id) => active.has(id));
  return current.length === labels.length && labels.every((id) => current.includes(id));
}

/**
 * Changes a task's fields at their version: the column (the done column takes it at the top, any
 * other at the end, decision 13), the project (active, the same column's end there), the due date
 * and the labels, which replace the active set. Only a column or project change moves it on the
 * board, so only that raises the revision (decision 15); the answer carries the revision either way.
 * A write that changes no field, with none sent or only the values the task has, is no edit: like a
 * move to the place an item already is, it answers the task as it is, without a new version or date,
 * so it neither conflicts with another tab's drawer nor reorders the recent items.
 */
export function updateTask(ctx: BoardContext, input: UpdateTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.updateTask', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    const projectId = await projectForEditedItem(repo, task.projectId, input.projectId);
    const column = await columnFor(repo, input, (columns) => columns.find((item) => item.id === task.columnId));
    const labels = input.labelIds ? await requireTaskLabels(repo, input.labelIds) : undefined;
    const dueOn = input.dueOn === undefined ? task.dueOn : input.dueOn;
    const moves = column.id !== task.columnId || projectId !== task.projectId;
    const labelsChanged = !(await sameLabels(repo, task.id, labels));
    if (!moves && dueOn === task.dueOn && !labelsChanged) return taskAck(task, await repo.revision());
    const now = ctx.now();
    const saved: TaskRecord = {
      ...task,
      projectId,
      columnId: column.id,
      position: moves ? await placeIn(repo, projectId, column, task.id) : task.position,
      dueOn,
      completedAt: completionIn(column, task, now),
      version: task.version + 1,
      updatedAt: now,
    };
    await repo.saveTaskFields(saved, task.version);
    if (labels) await repo.setTaskLabels(task.id, labels);
    const fields = (['projectId', 'columnId', 'position', 'dueOn', 'completedAt'] as const).filter(
      (key) => task[key] !== saved[key],
    );
    repo.taskFieldsUpdated(saved, labelsChanged ? [...fields, 'labelIds'] : fields);
    return taskAck(saved, moves ? await repo.bumpRevision() : await repo.revision());
  });
}
