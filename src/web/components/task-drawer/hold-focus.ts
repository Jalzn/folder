/**
 * Focuses an element now and keeps the focus there for the next two frames: a menu or the palette that opened
 * the drawer gives the focus back to its own trigger as it closes, a frame after the drawer took it. Focus that
 * moved within `within`, read when the frames pass, stays where it went. Returns a cancel.
 */
export function holdFocus(
  element: HTMLElement,
  within: () => HTMLElement | null,
  focus: () => void = () => element.focus(),
) {
  focus();
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (element.isConnected && !(within() ?? element).contains(active)) focus();
    });
  });
  return () => cancelAnimationFrame(frame);
}
