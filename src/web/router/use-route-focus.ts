import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

/**
 * After each navigation, moves focus to the page's `h1` (focusable with tabindex -1), as the prototype does,
 * unless the new page already put it in a field, an editor or a dialog. `announce` reads the new page's
 * title out, every navigation.
 */
export function useRouteFocus(announce: (text: string) => void) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const previous = useRef(pathname);
  const latest = useRef(announce);
  latest.current = announce;
  useEffect(() => {
    // The first page keeps the browser's own focus; only navigations move it.
    if (previous.current === pathname) return;
    previous.current = pathname;
    let frame = 0;
    let attempts = 0;
    // The page may still be loading its data: look for its title for about half a second.
    const settle = () => {
      const heading = document.querySelector<HTMLElement>('main h1[tabindex="-1"]');
      if (!heading && attempts++ < 30) {
        frame = requestAnimationFrame(settle);
        return;
      }
      const active = document.activeElement;
      const placed =
        active && active !== document.body && (active.closest('main') || active.closest('[role="dialog"]'));
      if (heading && !placed) heading.focus({ preventScroll: true });
      latest.current(heading?.textContent ?? document.title);
    };
    frame = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
}
