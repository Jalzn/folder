import { api } from '../../lib/api';
import type { ItemType } from '../../lib/types';
import { useAction } from '../../lib/use-action';

/**
 * Pins and unpins documents and drawings: repeatable writes without a request record that change neither
 * version nor dates. The ninth pin of a project is refused with the server's message.
 */
export function usePins() {
  const action = useAction();
  return {
    busy: action.busy,
    pin: (type: ItemType, id: string) => action.run(() => api.workspace.pinItem({ type, id })),
    unpin: (type: ItemType, id: string) => action.run(() => api.workspace.unpinItem({ type, id })),
  };
}
