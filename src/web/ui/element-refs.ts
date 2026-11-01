import { useState } from 'react';

/**
 * Elements by ID, for moving the focus by reference, never by CSS selector. `ref(id)` is a React 19 callback
 * ref that keeps the latest element of each ID: one that mounts again elsewhere, as a card moved to another
 * column, replaces the old one, and the old one's cleanup leaves it in place.
 */
export function createElementRefs<T extends HTMLElement>() {
  const elements = new Map<string, T>();
  return {
    elements: elements as ReadonlyMap<string, T>,
    /** The element of `id` while it is on the page. */
    get: (id: string) => {
      const element = elements.get(id);
      return element?.isConnected ? element : undefined;
    },
    ref: (id: string) => (element: T | null) => {
      if (element) elements.set(id, element);
      return () => {
        if (element && elements.get(id) === element) elements.delete(id);
      };
    },
  };
}

export type ElementRefs<T extends HTMLElement> = ReturnType<typeof createElementRefs<T>>;

/** A component's elements by ID, for its life (createElementRefs). */
export function useElementRefs<T extends HTMLElement>() {
  const [refs] = useState(() => createElementRefs<T>());
  return refs;
}
