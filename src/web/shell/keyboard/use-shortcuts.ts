import { useEffect, useRef } from 'react';
import { usesCommandKey } from '../../lib/platform';
import { useShellActions } from '../shell-ui';
import { createChords } from './chords';
import { acceptsPalette, acceptsPlainKey, acceptsUndo, commandKey, describeTarget, isComposing } from './guards';
import { escapeAction } from './layers';
import type { useShortcutActions } from './use-shortcut-actions';

type Actions = ReturnType<typeof useShortcutActions>;

/** The app's G chords, one for every listener: the Itens tree hands a key over while one is pending. */
const chords = createChords();

/** Whether a G waits for its second key. */
export const chordPending = () => chords.pending;

/**
 * Hands a key to the shortcuts, as if pressed on the page, from a list that would take it for itself, such as
 * a tree's type-to-select.
 */
export function forwardToShortcuts(event: { key: string; shiftKey: boolean }) {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: event.key, shiftKey: event.shiftKey, bubbles: true }),
  );
}

/** Returns focus from a text field to the page, the first Esc in a field. */
function leaveField(field: EventTarget | null) {
  if (field instanceof HTMLElement) field.blur();
  document.getElementById('main-content')?.focus({ preventScroll: true });
}

/**
 * The single keyboard listener of the app (docs/etapas/08-fundacao.md, "Teclado e Esc"). ⌘K and ⌘\ work
 * anywhere, ⌘K not inside the drawing editor; ⌘Z undoes the toast on screen outside fields, editors and
 * overlays; single keys and G chords only outside fields, the drawing editor and open menus; Esc closes the
 * most recent layer and nothing else.
 */
export function useShortcuts(actions: Actions) {
  const { layers } = useShellActions();
  const latest = useRef(actions);
  latest.current = actions;
  useEffect(() => {
    chords.reset();
    const onKeyDown = (event: KeyboardEvent) => {
      // Keys that confirm or cancel an IME composition belong to it, Esc included.
      if (isComposing(event)) return;
      const run = latest.current;
      const target = describeTarget(event.target);
      if (event.key === 'Escape') {
        // A held Esc repeats; one press closes at most one layer.
        if (event.repeat) return;
        const action = escapeAction(layers, {
          handled: event.defaultPrevented,
          editable: target.editable,
          inDrawing: target.inDrawing,
        });
        if (action.kind === 'leave-field') leaveField(event.target);
        if (action.kind === 'close') {
          event.preventDefault();
          action.layer.close();
        }
        // The document editor leaves itself on Esc; focus then belongs to the page, not to the body.
        if (target.editable && !target.inDrawing)
          requestAnimationFrame(() => {
            if (document.activeElement === document.body) leaveField(null);
          });
        return;
      }
      if (commandKey(event, usesCommandKey()) && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === 'k' && acceptsPalette(target)) {
          event.preventDefault();
          run.palette();
        } else if (key === '\\') {
          event.preventDefault();
          run.toggleSidebar();
        } else if (key === 's' && run.saveNow()) event.preventDefault();
        else if (key === '[' && !target.inDrawing) {
          event.preventDefault();
          run.back();
        }
        // Without a toast offering an undo, ⌘Z stays with the page.
        else if (key === 'z' && acceptsUndo(event, target) && run.undo()) event.preventDefault();
        return;
      }
      if (event.key === 'F6') {
        event.preventDefault();
        run.cycleRegions(event.shiftKey);
        return;
      }
      if (event.defaultPrevented || !acceptsPlainKey(event, target)) {
        chords.reset();
        return;
      }
      const chord = chords.press(event.key);
      if (chord) {
        event.preventDefault();
        if (chord !== 'pending' && chord !== 'discarded') run.chord(chord);
        return;
      }
      const single: Record<string, () => void> = {
        '/': run.search,
        n: run.newItem,
        p: run.pinCurrent,
        m: run.moveCurrent,
        '?': run.shortcuts,
      };
      const action = single[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [layers]);
}
