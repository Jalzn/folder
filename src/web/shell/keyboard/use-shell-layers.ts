import { useStableHandlers } from '../../lib/react/use-stable-handlers';
import { useShellOverlays } from '../shell-ui';
import { useLayer } from './use-layer';

/**
 * Puts the shell's own overlays on the Esc stack: the sidebar over the page, the switcher, the palette,
 * the shortcuts, and the N and M menus. React Aria closes an overlay when Esc comes from inside it; the
 * stack covers an Esc that lands outside, as when a second Esc arrives before focus is back in the
 * layer below.
 */
export function useShellLayers() {
  const ui = useShellOverlays();
  const close = useStableHandlers({
    overlay: () => ui.setOverlay(false),
    switcher: () => ui.setSwitcherAt(null),
    palette: () => ui.closePalette(),
    shortcuts: () => ui.setShortcutsOpen(false),
    labels: () => ui.setLabelsOpen(false),
    newItem: () => ui.setNewItemOpen(false),
    move: () => ui.setMoveOpen(false),
  });
  useLayer('overlay', ui.overlay.open, close.overlay);
  useLayer('switcher', ui.switcherAt !== null, close.switcher);
  useLayer('palette', ui.palette !== null, close.palette);
  useLayer('shortcuts', ui.shortcutsOpen, close.shortcuts);
  useLayer('labels', ui.labelsOpen, close.labels);
  useLayer('new-item', ui.newItemOpen, close.newItem);
  useLayer('move', Boolean(ui.moveOpen), close.move);
}
