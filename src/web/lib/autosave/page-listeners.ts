import type { SaveStatus } from './types';

/** What the page's listeners need of an autosave: its status and a save now. */
export interface WatchedSave {
  getState(): { status: SaveStatus };
  flush(): Promise<boolean>;
}

/** Where the page tells of the network, of leaving and of hiding: the window and the document. */
export interface PageEvents {
  window: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  document: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & { visibilityState?: string };
}

/**
 * What the page does for an autosave, for an open editor and for a session that outlived it (WF-5): try a failed
 * save again when the network comes back, warn before the page leaves with unsaved work, and save when the tab
 * hides. `keep` writes the local draft at those moments, for an editor that keeps it on a delay. Hiding the tab
 * leaves a failed save to the network's return in an open editor, and tries it again in a session that outlived
 * its editor (`retryOnHide`), the difference of today that decision 6 removes. Returns the removal.
 */
export function watchPage(
  controller: WatchedSave,
  events: PageEvents,
  { keep = () => undefined, retryOnHide }: { keep?: () => void; retryOnHide: boolean },
) {
  const retry = () => {
    if (controller.getState().status === 'error') void controller.flush();
  };
  const beforeLeave = (event: Event) => {
    if (controller.getState().status === 'saved') return;
    keep();
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = '';
  };
  const notOnHide: readonly SaveStatus[] = retryOnHide ? ['conflict', 'saved'] : ['error', 'conflict'];
  const hidden = () => {
    keep();
    if (events.document.visibilityState === 'hidden' && !notOnHide.includes(controller.getState().status))
      void controller.flush();
  };
  events.window.addEventListener('online', retry);
  events.window.addEventListener('beforeunload', beforeLeave);
  events.document.addEventListener('visibilitychange', hidden);
  return () => {
    events.window.removeEventListener('online', retry);
    events.window.removeEventListener('beforeunload', beforeLeave);
    events.document.removeEventListener('visibilitychange', hidden);
  };
}
