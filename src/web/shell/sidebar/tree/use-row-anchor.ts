import { type RefObject, useLayoutEffect, useRef } from 'react';
import { rowIn } from './tree-dom';

/**
 * Where a popover opened from a row anchors: that row as React Aria draws it, or the tree when it is gone.
 * A real ref, kept up to date at each render and after each commit, since a menu stays open over a row that
 * the data may redraw.
 */
export function useRowAnchor(tree: RefObject<HTMLElement | null>, key: string | null) {
  const anchor = useRef<HTMLElement | null>(null);
  anchor.current = rowIn(tree.current, key) ?? tree.current;
  useLayoutEffect(() => {
    anchor.current = rowIn(tree.current, key) ?? tree.current;
  });
  return anchor;
}
