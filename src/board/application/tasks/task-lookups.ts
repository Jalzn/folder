import { boardErrors } from '../errors.js';
import type { BoardRepositories } from '../ports/context.js';
import type { TaskRecord } from '../ports/tasks.js';

export async function requireTask(repo: BoardRepositories, id: string): Promise<TaskRecord> {
  const task = await repo.findTask(id);
  if (!task || task.deletedAt) throw boardErrors.taskMissing();
  return task;
}
