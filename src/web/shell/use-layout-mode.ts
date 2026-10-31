import { useSyncExternalStore } from 'react';

/**
 * The shell by window width (docs/etapas/08-fundacao.md, "Layout e larguras"): from 1100 px the sidebar is
 * fixed, or a 52 px rail when collapsed; from 720 px it starts as the rail and expands over the page; below,
 * a top bar opens it over the page.
 */
export type LayoutMode = 'wide' | 'medium' | 'narrow';

const wide = '(min-width: 1100px)';
const medium = '(min-width: 720px)';

function mode(): LayoutMode {
  if (matchMedia(wide).matches) return 'wide';
  return matchMedia(medium).matches ? 'medium' : 'narrow';
}

function subscribe(listener: () => void) {
  const queries = [matchMedia(wide), matchMedia(medium)];
  for (const query of queries) query.addEventListener('change', listener);
  return () => {
    for (const query of queries) query.removeEventListener('change', listener);
  };
}

export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribe, mode);
}
