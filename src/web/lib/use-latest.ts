import { useRef } from 'react';

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
