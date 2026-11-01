import type { SaveStatus } from './autosave';

/** What the pool needs of an autosave: its status, its changes, and a save now. */
export interface PooledController {
  getState(): { status: SaveStatus };
  subscribe(listener: () => void): () => void;
  flush(): Promise<boolean>;
}

/** Where the page tells of the network, of leaving and of hiding: the window and the document. */
export interface PageEvents {
  window: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  document: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & { visibilityState?: string };
}

/**
 * What an editor does for its autosave while it is open, done for a session that outlived it with unsaved
 * text: try again when the network comes back, warn before the page leaves, and save when the tab hides.
 * Returns the removal.
 */
export function listenInBackground(controller: PooledController, events: PageEvents) {
  const retry = () => {
    if (controller.getState().status === 'error') void controller.flush();
  };
  const beforeLeave = (event: Event) => {
    if (controller.getState().status === 'saved') return;
    event.preventDefault();
    (event as BeforeUnloadEvent).returnValue = '';
  };
  const hidden = () => {
    const { status } = controller.getState();
    if (events.document.visibilityState === 'hidden' && status !== 'conflict' && status !== 'saved')
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

/**
 * The tab's editing sessions by identity, as a task's text: one lives while an editor holds it, or while its
 * text is not saved. Released with unsaved text, it keeps the page's listeners an open editor had (retry when
 * online, the warning before leaving), so its "não salvo" dot clears by itself; it leaves, with them, once
 * saved. Nothing outlives its use.
 */
export function createSessionPool<C extends PooledController>({
  register,
  events,
}: {
  /** The save registry's registration, for the dot; returns its removal. */
  register: (id: string, controller: C) => () => void;
  events: () => PageEvents;
}) {
  const sessions = new Map<
    string,
    { controller: C; unregister: () => void; holders: number; background: (() => void) | null }
  >();
  return {
    /** The session's controller, made by `create` the first time. */
    controllerOf(identity: string, id: string, create: () => C) {
      const session = sessions.get(identity);
      if (session) return session.controller;
      const controller = create();
      sessions.set(identity, { controller, unregister: register(id, controller), holders: 0, background: null });
      return controller;
    },
    /** An editor holds the session while it shows it; the returned release lets it go once saved. */
    hold(identity: string) {
      const session = sessions.get(identity);
      if (!session) return () => undefined;
      session.holders += 1;
      // The editor's own listeners take over.
      session.background?.();
      session.background = null;
      return () => {
        session.holders -= 1;
        const drop = () => {
          if (session.holders > 0 || sessions.get(identity) !== session) return true;
          if (session.controller.getState().status !== 'saved') return false;
          sessions.delete(identity);
          session.background?.();
          session.background = null;
          session.unregister();
          return true;
        };
        if (drop()) return;
        session.background = listenInBackground(session.controller, events());
        const stop = session.controller.subscribe(() => {
          if (drop()) stop();
        });
      };
    },
    /** How many sessions the tab keeps. */
    size: () => sessions.size,
  };
}
