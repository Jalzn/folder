import type { Page } from './ports.js';

/**
 * The items of a keyset page and the cursor after the first `shown` of them: a tool may show fewer
 * than the page to fit its output budget. The cursor is null when nothing follows.
 */
export function keysetPage<T>(page: Page<T>, cursorOf: (item: T) => string) {
  return {
    items: page.items,
    nextCursor(shown: number): string | null {
      const last = page.items[shown - 1];
      return last && (shown < page.items.length || page.hasMore) ? cursorOf(last) : null;
    },
  };
}
