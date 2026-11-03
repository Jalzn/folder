import type { SaveStatus } from './types';

/** What the page's listeners need of an autosave: its status, whether it was refused for good, and a save now. */
export interface WatchedSave {
  getState(): { status: SaveStatus; refused: boolean };
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
 * also tries a failed save again (decision 6). Neither moment resends a refusal for good of a text unchanged
 * since, which a resend would only repeat, and hiding never resends a conflict, which the person resolves.
 * Returns the removal.
 */
export function watchPage(
  controller: WatchedSave,
  events: PageEvents,
  { keep = () => undefined }: { keep?: () => void } = {},
) {
  const retry = () => {
    const { status, refused } = controller.getState();
    if (status === 'error' && !refused) void controller.flush();
  };
  const beforeLeave = (event: Event) => {
    if (controller.getState().status === 'saved') return;
    keep();
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = '';
  };
  const savesOnHide = () => {
    const { status, refused } = controller.getState();
    return status === 'error' ? !refused : status !== 'conflict' && status !== 'saved';
  };
  const hidden = () => {
    keep();
    if (events.document.visibilityState === 'hidden' && savesOnHide()) void controller.flush();
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
