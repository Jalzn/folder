import type { TaskAck } from '../../domain/task-models.js';
import { workspaceErrors } from '../errors.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { RestoreTaskInput } from '../schemas/tasks.js';
import { assertVersion } from '../version.js';
import { taskAck } from './task-rules.js';

/** Brings a task back from the trash to the end of its column, which is always active, completion intact. */
export function restoreTask(ctx: WorkspaceContext, input: RestoreTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.restoreTask', input, async (repo) => {
    const task = await repo.findTask(input.id);
    if (!task) throw workspaceErrors.taskMissing();
    assertVersion(task.version, input.expectedVersion);
    if (!task.deletedAt) throw workspaceErrors.taskNotTrashed();
    const saved = {
      ...task,
      deletedAt: null,
      position: await repo.nextPosition(task.projectId, task.columnId),
      version: task.version + 1,
      updatedAt: ctx.now(),
    };
    await repo.saveTaskFields(saved, task.version);
    return taskAck(saved, await repo.bumpRevision());
  });
}
