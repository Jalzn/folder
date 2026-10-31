import { api } from '../../lib/api';
import type { Task, TaskStatus } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';

/**
 * The board's writes, one at a time: move a task to a column, before another task or at the end, and
 * complete or reopen it. A retried write reuses its request.
 */
export function useBoardMoves(revision: number | undefined) {
  const action = useAction();
  const request = useRequest();
  async function move(task: Task, status: TaskStatus, beforeTaskId: string | null = null) {
    if (revision === undefined || task.id === beforeTaskId) return;
    const input = { id: task.id, expectedVersion: task.version, expectedRevision: revision, status, beforeTaskId };
    await action.run(
      () => api.workspace.moveTask({ ...input, requestId: request.for(input) }),
      () => request.clear(),
    );
  }
  async function complete(task: Task) {
    const status = task.status === 'done' ? ('todo' as const) : ('done' as const);
    const input = { id: task.id, expectedVersion: task.version, status };
    await action.run(
      () => api.workspace.updateTask({ ...input, requestId: request.for(input) }),
      () => request.clear(),
    );
  }
  return { busy: action.busy, move, complete };
}
