import { type PageEvents, type SaveStatus, watchPage } from './autosave';

export type { PageEvents };

/** What the pool needs of an autosave: its status, its changes, and a save now. */
export interface PooledController {
  getState(): { status: SaveStatus };
  subscribe(listener: () => void): () => void;
  flush(): Promise<boolean>;
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
        // What an open editor does for its autosave, done for a session that outlived it with unsaved text.
        session.background = watchPage(session.controller, events(), { retryOnHide: true });
        const stop = session.controller.subscribe(() => {
          if (drop()) stop();
        });
      };
    },
    /** How many sessions the tab keeps. */
    size: () => sessions.size,
  };
}
