import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { recordPath, recordScroll } from './last-location';
import { loadNavState, saveNavState } from './nav-store';
import { parseProjectPath } from './paths';
import { pageScroller, restoreScheduledScroll } from './scroll';

const SCROLL_INTERVAL_MS = 250;

/**
 * Keeps the last place of each project on this device: every navigation inside a project, its scroll
 * position at most every 250 ms, and once more when the page is hidden.
 */
export function useLastLocation(installationId: string) {
  const href = useLocation({ select: (location) => location.href });
  const current = useRef(href);
  current.current = href;

  useEffect(() => {
    const projectId = parseProjectPath(href)?.projectId;
    if (projectId)
      saveNavState(installationId, recordPath(loadNavState(installationId), projectId, href, new Date().toISOString()));
    restoreScheduledScroll(href);
  }, [href, installationId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      timer = undefined;
      const path = current.current;
      const projectId = parseProjectPath(path)?.projectId;
      if (!projectId) return;
      const state = loadNavState(installationId);
      const next = recordScroll(state, projectId, path, pageScroller().scrollTop);
      if (next !== state) saveNavState(installationId, next);
    };
    const scrolled = (event: Event) => {
      const scroller = pageScroller();
      if (event.target !== scroller && !(event.target === document && scroller === document.scrollingElement)) return;
      timer ??= setTimeout(save, SCROLL_INTERVAL_MS);
    };
    window.addEventListener('scroll', scrolled, { capture: true, passive: true });
    window.addEventListener('pagehide', save);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', scrolled, { capture: true });
      window.removeEventListener('pagehide', save);
    };
  }, [installationId]);
}
