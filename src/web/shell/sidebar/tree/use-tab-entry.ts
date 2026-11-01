import { type FocusEvent, useRef } from 'react';

/** When Tab was last pressed anywhere, to tell a Tab into the tree from a click or a focus by code. */
let lastTab = Number.NEGATIVE_INFINITY;
if (typeof document !== 'undefined')
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab') lastTab = performance.now();
    },
    true,
  );

/**
 * Tab and ⇧Tab come into the tree at the open item's row, as the sidebar's rows did in stage 08, until a row
 * was focused once: React Aria then comes back to that one. Without an open item in the tree, React Aria's
 * first or last row stays. For the tree's container, as `onFocusCapture`.
 */
export function useTabEntry(currentRow: () => HTMLElement | null) {
  const entered = useRef(false);
  return (event: FocusEvent<HTMLElement>) => {
    const from = event.relatedTarget;
    if (from instanceof Node && event.currentTarget.contains(from)) return;
    const viaTab = performance.now() - lastTab < 300;
    const first = !entered.current;
    entered.current = true;
    if (!first || !viaTab) return;
    const current = currentRow();
    if (current && event.target !== current) current.focus();
  };
}
