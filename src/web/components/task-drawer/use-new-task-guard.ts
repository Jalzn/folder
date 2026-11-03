import { useEffect } from 'react';
import { useLatest } from '../../lib/react/use-latest';
import { useTaskDrawer } from '../../shell/state';

/** A new draft asks before closing; the guard is installed in the same passive phase as the form. */
export function useNewTaskGuard(dirty: boolean, ask: () => void) {
  const drawer = useTaskDrawer();
  const latest = useLatest({ dirty, ask });
  useEffect(() => {
    drawer.setCloseGuard(() => {
      if (!latest.current.dirty) return true;
      latest.current.ask();
      return false;
    });
    return () => drawer.setCloseGuard(null);
  }, [drawer]);
}
