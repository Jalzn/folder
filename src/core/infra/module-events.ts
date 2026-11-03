import type { EventPublisher, EventSource, ModuleEvent } from '../application/module-events.js';

export interface EventChannel<Event extends ModuleEvent> extends EventPublisher<Event> {
  readonly source: EventSource<Event>;
  dispose(): void;
  /** Waits for currently scheduled listeners; useful for deterministic integration tests. */
  drain(): Promise<void>;
}

/** A failed observer or diagnostic sink can never change an already committed write. */
export function reportObserverError(logError: (error: unknown) => void, error: unknown): void {
  try {
    Promise.resolve(logError(error)).catch(() => {});
  } catch {
    // Error reporting is best effort too.
  }
}

function freeze<Event>(value: Event): Event {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

/** Immutable snapshots keep a caller or another subscriber from altering an event's meaning. */
export const eventSnapshot = <Event>(event: Event): Event => freeze(structuredClone(event));

/** In-process, best-effort notifications. Every application composition owns its own channels. */
export function createEventChannel<Event extends ModuleEvent>({
  logError = console.error,
}: {
  logError?: (error: unknown) => void;
} = {}): EventChannel<Event> {
  interface Listener {
    active: boolean;
    type: string;
    run(event: Event): void | Promise<void>;
  }
  const listeners = new Set<Listener>();
  const pending = new Set<Promise<void>>();
  let disposed = false;

  const source: EventSource<Event> = {
    on(type, handler) {
      if (disposed) return () => {};
      const listener: Listener = { active: true, type, run: (event) => handler(event as never) };
      listeners.add(listener);
      return () => {
        listener.active = false;
        listeners.delete(listener);
      };
    },
  };

  return {
    source,
    publish(event) {
      if (disposed) return;
      const snapshot = eventSnapshot(event);
      for (const listener of listeners) {
        if (listener.type !== event.type) continue;
        const delivery = Promise.resolve()
          .then(() => {
            if (listener.active) return listener.run(snapshot);
          })
          .catch((error: unknown) => reportObserverError(logError, error));
        pending.add(delivery);
        void delivery.then(() => pending.delete(delivery));
      }
    },
    async drain() {
      while (pending.size) await Promise.all([...pending]);
    },
    dispose() {
      disposed = true;
      for (const listener of listeners) listener.active = false;
      listeners.clear();
    },
  };
}
