import { useSyncExternalStore } from 'react';
import { pendingSaves, subscribePendingSaves } from '../../lib/autosave/save-registry';

/** The items with unconfirmed changes in this tab, for the "não salvo" dots. */
export function usePendingSaves() {
  return useSyncExternalStore(subscribePendingSaves, pendingSaves);
}
