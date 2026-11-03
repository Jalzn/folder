import { useState } from 'react';
import { lateHandlers } from './late-handlers';
import { useLatest } from './use-latest';

/** Event handlers read the latest render; absent optional commands stay absent (WF-7, WP-11). */
export function useStableHandlers<T extends object>(handlers: T): T {
  const latest = useLatest(handlers);
  const [stable] = useState(() => lateHandlers(() => latest.current));
  return stable;
}
