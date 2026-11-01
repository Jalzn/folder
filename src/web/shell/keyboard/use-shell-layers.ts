import { useMemo, useRef } from 'react';
import { useShellUi } from '../shell-ui';
import { useLayer } from './use-layer';

/**
 * Puts the shell's own overlays on the Esc stack: the sidebar over the page, the switcher, the palette,
 * the shortcuts, and the N and M menus. React Aria closes an overlay when Esc comes from inside it; the
 * stack covers an Esc that lands outside, as when a second Esc arrives before focus is back in the
 * layer below.
 */
export function useShellLayers() {
  const ui = useShellUi();
  const latest = useRef(ui);
  latest.current = ui;
  // Stable closers: a new one would register the layer again, at the top.
  const close = useMemo(
    () => ({
      overlay: () => latest.current.setOverlay(false),
      switcher: () => latest.current.setSwitcherAt(null),
      palette: () => latest.current.closePalette(),
      shortcuts: () => latest.current.setShortcutsOpen(false),
      newItem: () => latest.current.setNewItemOpen(false),
      move: () => latest.current.setMoveOpen(false),
    }),
    [],
  );
  useLayer('overlay', ui.overlay.open, close.overlay);
  useLayer('switcher', ui.switcherAt !== null, close.switcher);
  useLayer('palette', ui.palette !== null, close.palette);
  useLayer('shortcuts', ui.shortcutsOpen, close.shortcuts);
  useLayer('new-item', ui.newItemOpen, close.newItem);
  useLayer('move', Boolean(ui.moveOpen), close.move);
}
