import { useCallback, useState } from 'react';
import { clampShare, DRAWER_HEIGHT, parseDrawerShare } from './drawer-height';

/** Where this device keeps the drawer's height: `tinyfold:<installationId>:drawer`. */
export const drawerHeightKey = (installationId: string) => `tinyfold:${installationId}:drawer`;

/** The drawer's height share on this device, read once and written at each change. */
export function useDrawerHeight(installationId: string) {
  const key = drawerHeightKey(installationId);
  const [share, setShareState] = useState(() => {
    try {
      return parseDrawerShare(localStorage.getItem(key));
    } catch {
      // Blocked storage: the initial height for this visit.
      return DRAWER_HEIGHT.initial;
    }
  });
  const setShare = useCallback(
    (next: number) => {
      const value = clampShare(next);
      setShareState(value);
      try {
        localStorage.setItem(key, JSON.stringify({ height: value }));
      } catch {
        // Kept until the page closes.
      }
      return value;
    },
    [key],
  );
  return [share, setShare] as const;
}
