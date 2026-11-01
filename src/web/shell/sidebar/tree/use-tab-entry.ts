import { type FocusEvent, useEffect, useRef } from 'react';

/**
 * Tab and ⇧Tab come into the tree at the open item's row, as the sidebar's rows did in stage 08, until a row
 * was focused once: React Aria then comes back to that one. Without an open item in the tree, React Aria's
 * first or last row stays. A Tab is told from a click or a focus by code by a Tab pressed just before, which
 * the hook follows while the tree is mounted. For the tree's container, as `onFocusCapture`.
 */
export function useTabEntry(currentRow: () => HTMLElement | null) {
  const entered = useRef(false);
  const lastTab = useRef(Number.NEGATIVE_INFINITY);
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') lastTab.current = performance.now();
    };
    document.addEventListener('keydown', keyDown, true);
    return () => document.removeEventListener('keydown', keyDown, true);
  }, []);
  return (event: FocusEvent<HTMLElement>) => {
    const from = event.relatedTarget;
    if (from instanceof Node && event.currentTarget.contains(from)) return;
    const viaTab = performance.now() - lastTab.current < 300;
    const first = !entered.current;
    entered.current = true;
    if (!first || !viaTab) return;
    const current = currentRow();
    if (current && event.target !== current) current.focus();
  };
}
