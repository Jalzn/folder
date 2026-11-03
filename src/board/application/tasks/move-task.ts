import { assertVersion } from '#core/application';
import type { TaskAck } from '../../domain/task-models.js';
import { boardErrors } from '../errors.js';
import type { BoardContext } from '../ports/context.js';
import type { MoveTaskInput } from '../schemas/tasks.js';
import { requireTask } from './task-lookups.js';
import { columnFor, completionIn, taskAck } from './task-rules.js';

/**
 * Moves a task in its project's board, before `beforeTaskId` or at the end of the column, renumbering
 * only that column. Entering the done column completes it; leaving it reopens it. With
 * `expectedRevision`, as the board sends it, the board must be the one read. Without it, only for
 * the undo of a completion or a project change (decision 14), the place is checked by the neighbour:
 * once it left the column, the task goes to the end.
 */
export function moveTask(ctx: BoardContext, input: MoveTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.moveTask', input, async (repo) => {
    if (input.expectedRevision !== undefined && (await repo.revision()) !== input.expectedRevision)
      throw boardErrors.boardConflict();
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    if (input.beforeTaskId === task.id) throw boardErrors.sameTaskReference();
    const column = await columnFor(repo, input, () => undefined);
    // Boards are per project, so the column renumbered is the task's project's.
    const tasks = (await repo.tasksInColumn({ projectId: task.projectId, columnId: column.id })).filter(
      (item) => item.id !== task.id,
    );
    let index = input.beforeTaskId ? tasks.findIndex((item) => item.id === input.beforeTaskId) : tasks.length;
    if (index < 0 && input.expectedRevision === undefined) index = tasks.length;
    if (index < 0) throw boardErrors.staleTaskPosition();
    tasks.splice(index, 0, task);
    const now = ctx.now();
    const moved = {
      ...task,
      columnId: column.id,
      position: tasks.indexOf(task),
      completedAt: completionIn(column, task.columnId === column.id ? task : undefined, now),
      updatedAt: now,
      version: task.version + 1,
    };
    for (const [place, item] of tasks.entries()) {
      if (item === task) await repo.saveTaskFields(moved, task.version);
      // A neighbour that only shifts is not edited: the board revision, not its version, orders moves.
      else if (item.position !== place) await repo.setTaskPosition(item.id, place);
    }
    repo.taskFieldsUpdated(
      moved,
      (['columnId', 'position', 'completedAt'] as const).filter((key) => task[key] !== moved[key]),
    );
    return taskAck(moved, await repo.bumpRevision());
  });
}
