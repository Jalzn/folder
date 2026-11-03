import type { TrashPorts } from '../ports/context.js';
import type { ItemRemoval } from './removal.js';

type TaskPurgePorts = Pick<TrashPorts, 'findTask' | 'deleteTaskRow' | 'bumpRevision'>;

/** The task's source goes with it, and the board changes. */
export const taskRemoval: ItemRemoval<TaskPurgePorts> = {
  find: (repo, id) => repo.findTask(id),
  async remove(repo, task) {
    await repo.deleteTaskRow(task.id);
    await repo.bumpRevision();
  },
  missing: 'A tarefa não foi encontrada.',
};
