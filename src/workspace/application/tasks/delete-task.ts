import { assertVersion, requireTask } from '../helpers.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { DeleteTaskInput } from '../schemas/tasks.js';

/** Sends a task to the trash with its column, due date, labels, description and completion. */
export function deleteTask(ctx: WorkspaceContext, input: DeleteTaskInput) {
  return ctx.write('workspace.deleteTask', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    const now = ctx.now();
    await repo.saveTaskFields({ ...task, deletedAt: now, updatedAt: now, version: task.version + 1 }, task.version);
    return { id: task.id, revision: await repo.bumpRevision() };
  });
}
