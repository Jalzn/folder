import type { TaskDetail } from '../../domain/tasks.js';
import { boardErrors } from '../errors.js';
import type { BoardContext } from '../ports/context.js';
import type { GetTaskInput } from '../schemas/tasks.js';

/** A task with its description, also from the trash, so that the drawer can recover a draft of it. */
export function getTask(ctx: BoardContext, input: GetTaskInput): Promise<TaskDetail> {
  return ctx.read(async (repo) => {
    const task = await repo.taskDetail(input.id);
    if (!task) throw boardErrors.taskMissing();
    return task;
  });
}
