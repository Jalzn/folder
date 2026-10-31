/**
 * The element that scrolls the page: the body of its PageFrame, marked `data-scroll-key`. The drawing
 * editor fills the page without scrolling, and the document stands in.
 */
export function pageScroller(): HTMLElement {
  const marked = document.querySelectorAll<HTMLElement>('[data-scroll-key]');
  return marked[marked.length - 1] ?? (document.scrollingElement as HTMLElement);
}

let pending: { path: string; top: number } | null = null;

/** Asks for the scroll position of `path` to come back once that page has rendered its content. */
export function scheduleScrollRestore(path: string, top: number) {
  pending = top > 0 ? { path, top } : null;
}

/**
 * Restores a scheduled position for the page now shown. Content such as the document editor mounts
 * after the route, so this waits, up to five seconds, until the page is tall enough.
 */
export function restoreScheduledScroll(path: string) {
  if (!pending || pending.path !== path) return;
  const { top } = pending;
  pending = null;
  const deadline = performance.now() + 5000;
  const attempt = () => {
    const scroller = pageScroller();
    if (scroller.scrollHeight - scroller.clientHeight >= top || performance.now() > deadline) {
      scroller.scrollTop = top;
      return;
    }
    requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}
