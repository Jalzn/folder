import { useLayoutEffect, useRef } from 'react';

/** A capture older than this never plays: the move it was for changed nothing on screen. */
const STALE_MS = 3000;

/**
 * The cards' move on screen (docs/interface/visual.md §7): `capture` takes the cards' boxes before a move, and
 * once `data` changes each card that moved slides from its old place in 150 ms (FLIP), or only fades in with
 * reduced motion.
 */
export function useFlip(cards: ReadonlyMap<string, HTMLElement>, data: unknown) {
  const captured = useRef<{ boxes: Map<string, DOMRect>; at: number } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The cards play once the data they show changed.
  useLayoutEffect(() => {
    const before = captured.current;
    captured.current = null;
    if (!before || performance.now() - before.at > STALE_MS) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const [id, card] of cards) {
      const was = before.boxes.get(id);
      if (!was) continue;
      const now = card.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (!dx && !dy) continue;
      if (reduce) card.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 80, easing: 'linear' });
      else
        card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
          duration: 150,
          easing: 'cubic-bezier(.2, .8, .2, 1)',
        });
    }
  }, [data]);
  return () => {
    captured.current = {
      boxes: new Map([...cards].map(([id, card]) => [id, card.getBoundingClientRect()])),
      at: performance.now(),
    };
  };
}
