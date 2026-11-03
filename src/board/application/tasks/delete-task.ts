import { assertVersion } from '@tinyfold/core/application';
import type { BoardContext } from '../ports/context.js';
import type { DeleteTaskInput } from '../schemas/tasks.js';
import { requireTask } from './task-lookups.js';

/** Sends a task to the trash with its column, due date, labels, description and completion. */
export function deleteTask(ctx: BoardContext, input: DeleteTaskInput) {
  return ctx.write('workspace.deleteTask', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    const now = ctx.now();
    await repo.saveTaskFields({ ...task, deletedAt: now, updatedAt: now, version: task.version + 1 }, task.version);
    return { id: task.id, revision: await repo.bumpRevision() };
  });
}
