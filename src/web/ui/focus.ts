/** Menus, popovers and dialogs: what they focus is never where the focus goes back to. */
const overlay = '.popover, .modal-overlay, .palette-overlay, .sidebar-overlay, [role="dialog"], [role="menu"]';
/** What holds the page while it is open, so moving the focus would take it from there. */
const holding = '.popover, .modal-overlay, .palette-overlay';

let pageElement: HTMLElement | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (event) => {
    if (event.target instanceof HTMLElement && !event.target.closest(overlay)) pageElement = event.target;
  });
  // Focus that leaves to nothing, as a click on the page's background, leaves no element to go back to.
  document.addEventListener('focusout', (event) => {
    if (event.relatedTarget === null && event.target instanceof HTMLElement && !event.target.closest(overlay))
      pageElement = null;
  });
}

/** The element of the page that had the focus last, outside menus and dialogs; null when it is gone. */
export const pageFocus = () => (pageElement?.isConnected ? pageElement : null);

/**
 * Gives the focus back once nothing holds it, as when the row that had it went away or a dialog closed and
 * its trigger is gone: to `target` while it is on the page, otherwise to the page's title. A focus on `from`
 * counts as lost too: the trigger a popover gave it back to. Waits for open overlays, and gives up after
 * about half a second if the focus lands somewhere on its own.
 */
export function returnFocus(target: HTMLElement | null, { from }: { from?: Element | null } = {}) {
  let attempts = 0;
  const attempt = () => {
    const active = document.activeElement;
    const lost = !active || active === document.body || !active.isConnected || (from != null && active === from);
    const place = target?.isConnected ? target : document.querySelector<HTMLElement>('main h1[tabindex="-1"]');
    if (lost && place && !document.querySelector(holding)) {
      place.focus({ preventScroll: true });
      return;
    }
    if (attempts++ < 30) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

/**
 * Focuses an element once it shows, as a row the server just created or a folder's child that opens: looks
 * again at each frame, for `frames` frames, and runs `fallback` if it never shows. Returns a cancel.
 */
export function focusWhenPresent(
  find: (() => HTMLElement | null) | { readonly current: HTMLElement | null },
  { frames = 40, fallback }: { frames?: number; fallback?: () => void } = {},
) {
  const look = typeof find === 'function' ? find : () => find.current;
  let left = frames;
  let frame = 0;
  const attempt = () => {
    const element = look();
    if (element?.isConnected) element.focus();
    else if (left-- > 0) frame = requestAnimationFrame(attempt);
    else fallback?.();
  };
  frame = requestAnimationFrame(attempt);
  return () => cancelAnimationFrame(frame);
}

/**
 * Moves focus to the page's title once nothing holds it, as when the row that had it went away, or a dialog
 * closed over a row that is gone.
 */
export const focusPageTitle = () => returnFocus(null);
