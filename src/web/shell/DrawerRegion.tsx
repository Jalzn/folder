import { useCallback, useEffect, useRef, useState } from 'react';
import { TaskDrawer } from '../components/task-drawer/TaskDrawer';
import { useLayer } from './keyboard/use-layer';
import { useDrawerContent, useTaskDrawer } from './task-drawer-state';

/**
 * The drawer's place in the shell, below the page: the drawer while a task or a new one is open, on the Esc
 * stack in the order it opened. On closing, an empty surface of its height slides 16 px down in 160 ms while
 * the page already takes the room back (docs/interface/visual.md §7).
 */
export function DrawerRegion({ narrow }: { narrow: boolean }) {
  const content = useDrawerContent();
  const { close } = useTaskDrawer();
  const closeOnEsc = useCallback(() => close(), [close]);
  useLayer('drawer', content !== null, closeOnEsc);
  const height = useRef<number | null>(null);
  const keepHeight = useCallback((pixels: number | null) => {
    height.current = pixels;
  }, []);
  const [leaving, setLeaving] = useState<number | null>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    const open = content !== null;
    const closed = wasOpen.current && !open;
    wasOpen.current = open;
    if (!closed) return;
    setLeaving(height.current ?? 0);
    const timer = window.setTimeout(() => setLeaving(null), 160);
    return () => window.clearTimeout(timer);
  }, [content]);

  if (content) return <TaskDrawer content={content} narrow={narrow} onHeight={keepHeight} />;
  if (leaving === null) return null;
  return (
    <div
      className="task-drawer task-drawer--ghost"
      aria-hidden="true"
      style={narrow || !leaving ? undefined : { height: leaving }}
    />
  );
}
