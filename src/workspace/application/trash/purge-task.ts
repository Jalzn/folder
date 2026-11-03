import type { WorkspaceContext } from '../ports/context.js';
import type { PurgeItemInput } from '../schemas/trash.js';
import { type ItemRemoval, purgeTrashedItem } from './removal.js';

/** The task's source goes with it, and the board changes. */
export const taskRemoval: ItemRemoval = {
  find: (repo, id) => repo.findTask(id),
  async remove(repo, task) {
    await repo.deleteTaskRow(task.id);
    await repo.bumpRevision();
  },
  missing: 'A tarefa não foi encontrada.',
};

export const purgeTask = (ctx: WorkspaceContext, input: PurgeItemInput) =>
  purgeTrashedItem(ctx, 'workspace.purgeTask', taskRemoval, input);
