import { api, requestId } from '../../lib/api';
import { onceMoreIfLost } from '../../lib/lost-answer';
import type { WriteRunner } from '../../shell/writes';

/**
 * Creating a label with the next color, the one way for the labels dialog, the drawer's picker and a new task's:
 * through the caller's write queue, waiting for a write in progress, with one request per intent and the one
 * retry of a lost answer. Resolves to the new label's ID, or undefined when it failed.
 */
export function useCreateLabel(action: WriteRunner) {
  return async function createLabel(name: string) {
    const input = { requestId: requestId(), name };
    const created = await action.run(() => onceMoreIfLost(() => api.workspace.createLabel(input)), undefined, {
      queued: true,
    });
    return created?.id;
  };
}
