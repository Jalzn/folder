import { usesCommandKey } from '../../lib/platform';
import { acceptsPalette, commandKey, isCreateTaskKey, type KeyTarget, undoKeyAction } from './guards';
import type { useShortcutActions } from './use-shortcut-actions';

type Actions = ReturnType<typeof useShortcutActions>;

/**
 * The keys with ⌘ (Ctrl off Apple platforms) of the app's one listener (use-shortcuts.ts):
 *
 * - ⌘⌥T runs the page's "Criar tarefa", in the document's editor too, and never in the drawing editor;
 * - ⌘Z, ⇧⌘Z and Ctrl+Y never reach the browser's own undo outside fields and editors, and there ⌘Z undoes the
 *   toast on screen, outside menus and dialogs;
 * - ⌘K works anywhere but inside the drawing editor; ⌘\, ⌘S and ⌘[ as in stage 08.
 *
 * True when the key was one of them, which the plain keys then leave alone.
 */
export function handleModifierKey(event: KeyboardEvent, target: KeyTarget, run: Actions) {
  const apple = usesCommandKey();
  if (isCreateTaskKey(event, target, apple)) {
    if (run.createTask()) event.preventDefault();
    return true;
  }
  const undo = undoKeyAction(event, target, apple);
  if (undo) {
    if (undo === 'native') return true;
    const handled = event.defaultPrevented;
    event.preventDefault();
    if (undo === 'toast' && !handled) run.undo();
    return true;
  }
  if (!commandKey(event, apple) || event.altKey) return false;
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
  return true;
}
