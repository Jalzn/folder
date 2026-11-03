import { assertVersion } from '@tinyfold/core/application';
import type { TaskAck } from '../../domain/task-models.js';
import { boardErrors } from '../errors.js';
import type { BoardContext } from '../ports/context.js';
import type { RestoreTaskInput } from '../schemas/tasks.js';
import { taskAck } from './task-rules.js';

/** Brings a task back from the trash to the end of its column, which is always active, completion intact. */
export function restoreTask(ctx: BoardContext, input: RestoreTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.restoreTask', input, async (repo) => {
    const task = await repo.findTask(input.id);
    if (!task) throw boardErrors.taskMissing();
    assertVersion(task.version, input.expectedVersion);
    if (!task.deletedAt) throw boardErrors.taskNotTrashed();
    const saved = {
      ...task,
      deletedAt: null,
      position: await repo.nextPosition({ projectId: task.projectId, columnId: task.columnId }),
      version: task.version + 1,
      updatedAt: ctx.now(),
    };
    await repo.saveTaskFields(saved, task.version);
    return taskAck(saved, await repo.bumpRevision());
  });
}
