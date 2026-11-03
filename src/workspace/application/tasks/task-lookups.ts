import { workspaceErrors } from '../errors.js';
import type { WorkspaceRepository } from '../ports/context.js';
import type { TaskRecord } from '../ports/tasks.js';

export async function requireTask(repo: WorkspaceRepository, id: string): Promise<TaskRecord> {
  const task = await repo.findTask(id);
  if (!task || task.deletedAt) throw workspaceErrors.taskMissing();
  return task;
}
