import { AppError } from '@tinyfold/core/application';
import type { TaskAck } from '../../domain/models.js';
import { assertVersion } from '../helpers.js';
import type { WorkspaceContext } from '../ports.js';
import type { RestoreTaskInput } from '../schemas/tasks.js';
import { taskAck } from './task-rules.js';

/** Brings a task back from the trash to the end of its column, which is always active, completion intact. */
export function restoreTask(ctx: WorkspaceContext, input: RestoreTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.restoreTask', input, async (repo) => {
    const task = await repo.findTask(input.id);
    if (!task) throw new AppError('NOT_FOUND', 'A tarefa não foi encontrada.');
    assertVersion(task.version, input.expectedVersion);
    if (!task.deletedAt) throw new AppError('DOMAIN_RULE', 'A tarefa não está na lixeira.');
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
