/**
 * The board's elements by ID, for the focus and the drag (decision 10: focus by references, never by CSS
 * selector). `ref(id)` is a React 19 callback ref that keeps the latest element of each ID: a card that moves
 * to another column mounts again, and the old element's cleanup leaves the new one in place.
 */
export function createRefs<T extends HTMLElement>() {
  const elements = new Map<string, T>();
  return {
    elements: elements as ReadonlyMap<string, T>,
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
