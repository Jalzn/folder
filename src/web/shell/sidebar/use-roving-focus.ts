import { type KeyboardEvent, useCallback, useLayoutEffect, useRef } from 'react';

const rowSelector = '[data-roving]';

function rows(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(rowSelector)].filter((row) => row.offsetParent !== null);
}

/**
 * One tab stop for a list of rows: ↑ and ↓ move between the visible `[data-roving]` rows, Home and End go to
 * the first and the last. The tab stop is the current row (`aria-current`), or the first.
 */
export function useRovingFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const all = rows(container);
    if (all.some((row) => row.tabIndex === 0 && row.contains(document.activeElement))) return;
    const stop = all.find((row) => row.getAttribute('aria-current') === 'page') ?? all[0];
    for (const row of all) row.tabIndex = row === stop ? 0 : -1;
  });

  const onKeyDown = useCallback((event: KeyboardEvent<T>) => {
    const container = ref.current;
    if (!container || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const all = rows(container);
    const index = all.indexOf(event.target as HTMLElement);
    if (index < 0) return;
    const next = {
      ArrowDown: all[index + 1],
      ArrowUp: all[index - 1],
      Home: all[0],
      End: all[all.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    for (const row of all) row.tabIndex = row === next ? 0 : -1;
    next.focus();
  }, []);

  return { ref, onKeyDown };
}
