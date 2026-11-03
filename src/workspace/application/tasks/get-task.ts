import { AppError } from '@tinyfold/core/application';
import type { TaskDetail } from '../../domain/tasks.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { GetTaskInput } from '../schemas/tasks.js';

/** A task with its description, also from the trash, so that the drawer can recover a draft of it. */
export function getTask(ctx: WorkspaceContext, input: GetTaskInput): Promise<TaskDetail> {
  return ctx.read(async (repo) => {
    const task = await repo.taskDetail(input.id);
    if (!task) throw new AppError('NOT_FOUND', 'A tarefa não foi encontrada.');
    return task;
  });
}
