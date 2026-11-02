import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The value of the latest render, for a callback made once that must not read a stale one (WF-7): a listener
 * added in an effect, or a stable closer. It is written during the render, as the mirrors it replaces were, so
 * a child's effects already read it.
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const latest = useRef(value);
  latest.current = value;
  return latest;
}

/**
 * Handlers with one identity for the component's life, each calling the one of the latest render (WP-11), for
 * a context value or a dependency that must not change. The names are the first render's.
 */
export function useStableHandlers<T extends Record<string, (...args: never[]) => unknown>>(handlers: T): T {
  const latest = useLatest(handlers);
  const [stable] = useState(
    () =>
      Object.fromEntries(
        Object.keys(handlers).map((name) => [name, (...args: never[]) => latest.current[name]?.(...args)]),
      ) as T,
  );
  return stable;
}

/**
 * Lends this render's commands through `slot` to whoever calls them (WP-11), as the drawer's ⌘↵ or the board's
 * "Nova coluna": written in a layout effect after every render, and taken back on unmount unless another
 * component lent its own since.
 */
export function useCommandSlot<T>(slot: { current: T | null }, commands: T | null) {
  const lent = useRef<T | null>(null);
  useLayoutEffect(() => {
    slot.current = commands;
    lent.current = commands;
  });
  useLayoutEffect(
    () => () => {
      if (slot.current === lent.current) slot.current = null;
    },
    [slot],
  );
}
