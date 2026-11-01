import { useEffect } from 'react';
import { useShellActions } from '../shell-ui';

/** Keeps a layer on the Esc stack while `open`; Esc closes the most recent layer only. */
export function useLayer(id: string, open: boolean, close: () => void) {
  const { layers } = useShellActions();
  useEffect(() => (open ? layers.open({ id, close }) : undefined), [layers, id, open, close]);
}
