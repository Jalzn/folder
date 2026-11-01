import { type KeyboardEvent, useCallback, useLayoutEffect, useRef } from 'react';

const rowSelector = '[data-roving]';

function rows(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(rowSelector)].filter((row) => row.offsetParent !== null);
}

/** The first visible row of a list, as the first search result after ↓ in Buscar. */
export const firstRow = (container: HTMLElement | null) => (container ? (rows(container)[0] ?? null) : null);

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

  /** Whether an element is the last visible row, from which ↓ goes on to what follows the list. */
  const isLast = useCallback((element: EventTarget | null) => {
    const container = ref.current;
    return Boolean(container && element instanceof HTMLElement && rows(container).at(-1) === element);
  }, []);
  /** Back to the last row, as ↑ from what follows the list; it becomes the tab stop. */
  const focusLast = useCallback(() => {
    const container = ref.current;
    const all = container ? rows(container) : [];
    const last = all.at(-1);
    if (!last) return;
    for (const row of all) row.tabIndex = row === last ? 0 : -1;
    last.focus();
  }, []);

  return { ref, onKeyDown, isLast, focusLast };
}
