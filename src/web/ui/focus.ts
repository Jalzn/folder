/** Menus, popovers and dialogs: what they focus is never where the focus goes back to. */
const overlay = '.popover, .modal-overlay, .palette-overlay, .sidebar-overlay, [role="dialog"], [role="menu"]';
/** What holds the page while it is open, so moving the focus would take it from there. */
const holding = '.popover, .modal-overlay, .palette-overlay';

let pageElement: HTMLElement | null = null;

/**
 * Follows the focus on the page, outside menus and dialogs, for `pageFocus`. The app installs it once from its
 * root; it returns the removal, so a remount or a reload of the module in development does not add a second.
 */
export function trackPageFocus(target: Document = document) {
  const focusIn = (event: FocusEvent) => {
    if (event.target instanceof HTMLElement && !event.target.closest(overlay)) pageElement = event.target;
  };
  // Focus that leaves to nothing, as a click on the page's background, leaves no element to go back to.
  const focusOut = (event: FocusEvent) => {
    if (event.relatedTarget === null && event.target instanceof HTMLElement && !event.target.closest(overlay))
      pageElement = null;
  };
  target.addEventListener('focusin', focusIn);
  target.addEventListener('focusout', focusOut);
  return () => {
    target.removeEventListener('focusin', focusIn);
    target.removeEventListener('focusout', focusOut);
    pageElement = null;
  };
}

/** The element of the page that had the focus last, outside menus and dialogs; null when it is gone. */
export const pageFocus = () => (pageElement?.isConnected ? pageElement : null);

/**
 * The one wait of the app's focus moves: looks for something at each frame, for `frames` frames, until
 * `find` gives it; then `found` has it, or `missing` runs. Returns a cancel.
 */
export function whenPresent<T>(
  find: () => T | null | undefined,
  found: (value: T) => void,
  { frames = 40, missing }: { frames?: number; missing?: () => void } = {},
) {
  let left = frames;
  let frame = 0;
  const attempt = () => {
    const value = find();
    if (value != null) found(value);
    else if (left-- > 0) frame = requestAnimationFrame(attempt);
    else missing?.();
  };
  frame = requestAnimationFrame(attempt);
  return () => cancelAnimationFrame(frame);
}

/**
 * Focuses an element once it shows, as a row the server just created or a folder's child that opens, by a
 * function or a ref; `fallback` runs if it never shows. Returns a cancel.
 */
export function focusWhenPresent(
  find: (() => HTMLElement | null) | { readonly current: HTMLElement | null },
  { frames = 40, fallback }: { frames?: number; fallback?: () => void } = {},
) {
  const look = typeof find === 'function' ? find : () => find.current;
  return whenPresent(
    () => {
      const element = look();
      return element?.isConnected ? element : null;
    },
    (element) => element.focus(),
    { frames, ...(fallback ? { missing: fallback } : {}) },
  );
}

/** The page's focusable title. */
export const pageTitle = () => document.querySelector<HTMLElement>('main h1[tabindex="-1"]');

/**
 * Gives the focus back once nothing holds it, as when the row that had it went away or a dialog closed and
 * its trigger is gone: to `target` while it is on the page, otherwise to the page's title. A focus on `from`
 * counts as lost too: the trigger a popover gave it back to. Waits for open overlays, and gives up after
 * about half a second if the focus lands somewhere on its own.
 */
export function returnFocus(target: HTMLElement | null, { from }: { from?: Element | null } = {}) {
  whenPresent(
    () => {
      const active = document.activeElement;
      const lost = !active || active === document.body || !active.isConnected || (from != null && active === from);
      const place = target?.isConnected ? target : pageTitle();
      return lost && place && !document.querySelector(holding) ? place : null;
    },
    (place) => place.focus({ preventScroll: true }),
    { frames: 30 },
  );
}

/**
 * Moves focus to the page's title once nothing holds it, as when the row that had it went away, or a dialog
 * closed over a row that is gone.
 */
export const focusPageTitle = () => returnFocus(null);
