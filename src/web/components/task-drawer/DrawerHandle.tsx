import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { DRAWER_HEIGHT } from './drawer-height';

/**
 * The drawer's 32×4 px handle, a separator that sets its height: dragged with the pointer, ↑ and ↓ by 5%,
 * Home to 85% and End to 25%. `onShare` says whether to announce the new height, as for a key.
 */
export function DrawerHandle({
  share,
  available,
  onShare,
}: {
  share: number;
  /** The height the drawer shares with the page, in pixels. */
  available: () => number;
  onShare: (share: number, announce: boolean) => void;
}) {
  const drag = useRef<{ y: number; share: number } | null>(null);
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const to =
      event.key === 'ArrowUp'
        ? share + DRAWER_HEIGHT.step
        : event.key === 'ArrowDown'
          ? share - DRAWER_HEIGHT.step
          : event.key === 'Home'
            ? DRAWER_HEIGHT.max
            : event.key === 'End'
              ? DRAWER_HEIGHT.min
              : null;
    if (to === null) return;
    event.preventDefault();
    onShare(to, true);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, share };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start) return;
    onShare(start.share + (start.y - event.clientY) / Math.max(1, available()), false);
  }
  const end = () => {
    drag.current = null;
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: A focusable separator that resizes has no HTML element.
    <div
      className="drawer-handle"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Altura da gaveta"
      aria-valuemin={Math.round(DRAWER_HEIGHT.min * 100)}
      aria-valuemax={Math.round(DRAWER_HEIGHT.max * 100)}
      aria-valuenow={Math.round(share * 100)}
      aria-valuetext={`${Math.round(share * 100)}% da altura`}
      tabIndex={0}
      onKeyDown={keyDown}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span />
    </div>
  );
}
