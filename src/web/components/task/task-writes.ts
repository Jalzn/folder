import { api } from '../../lib/api';
import { onceMoreIfLost } from '../../lib/writes/lost-answer';

/** Queues own versions and request IDs; these writes only share the lost-answer retry policy. */
export const taskWrites = {
  update(input: Parameters<typeof api.workspace.updateTask>[0], { retryLost = true } = {}) {
    const write = () => api.workspace.updateTask(input);
    return retryLost ? onceMoreIfLost(write) : write();
  },
  move: (input: Parameters<typeof api.workspace.moveTask>[0]) => onceMoreIfLost(() => api.workspace.moveTask(input)),
  trash: (input: Parameters<typeof api.workspace.deleteTask>[0]) =>
    onceMoreIfLost(() => api.workspace.deleteTask(input)),
};
