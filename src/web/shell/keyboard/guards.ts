/** What a key event needs to know about its target, so the guards stay pure and testable. */
export interface KeyTarget {
  /** An input, a textarea, a select or a contenteditable element, the document editor included. */
  editable: boolean;
  /** Inside the drawing editor, which uses letters for its tools and Esc for itself. */
  inDrawing: boolean;
  /** Inside a menu, a listbox or a dialog, which read letters themselves (type to select). */
  inOverlay?: boolean;
}

export interface KeyPress {
  key: string;
  /** The physical key, which ⌥ does not change: ⌥T types "†" on a Mac, and its code stays KeyT. */
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** Inputs that take typed text; a radio, a checkbox or a button only takes a press. */
const textInput =
  'input:not([type="radio"]):not([type="checkbox"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]):not([type="color"]):not([type="file"])';

export function describeTarget(target: EventTarget | null): KeyTarget {
  const element = target instanceof Element ? target : null;
  return {
    editable: Boolean(
      element?.closest(`${textInput}, textarea, select, [contenteditable=""], [contenteditable="true"]`),
    ),
    inDrawing: Boolean(element?.closest('.excalidraw')),
    inOverlay: Boolean(element?.closest('[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]')),
  };
}

/**
 * Whether a key's target takes typed text, so the key is its own: the one rule for the shell, the board and the
 * drawer. A checkbox, a radio or a button only takes a press, and leaves the page's keys working.
 */
export const isTextTarget = (target: EventTarget | null) => describeTarget(target).editable;

/** A key that belongs to an IME composition: it confirms or cancels what is being composed. */
export const isComposing = (event: { isComposing: boolean; keyCode: number }) =>
  event.isComposing || event.keyCode === 229;

/** ⌘ on Apple platforms, Ctrl elsewhere. */
export const commandKey = (press: KeyPress, apple: boolean) => (apple ? press.metaKey : press.ctrlKey);

/**
 * Single keys and G chords work only outside text fields, the drawing editor and open menus or dialogs, and
 * without modifiers: Shift only for "?", which needs it on most layouts.
 */
export function acceptsPlainKey(press: KeyPress, target: KeyTarget) {
  return (
    !target.editable &&
    !target.inDrawing &&
    !target.inOverlay &&
    !press.metaKey &&
    !press.ctrlKey &&
    !press.altKey &&
    (!press.shiftKey || press.key === '?')
  );
}

/** ⌘K works anywhere but inside the drawing editor. */
export const acceptsPalette = (target: KeyTarget) => !target.inDrawing;

/**
 * What an undo or redo key does: ⌘Z and ⇧⌘Z, and Ctrl+Y off Apple platforms (`null` for any other key).
 *
 * - `native`: in a text field, the document or description editor, or the drawing editor, each keeps its
 *   own undo (docs/etapas/09-pastas.md, decision 11).
 * - `toast`: anywhere else, outside menus and dialogs, ⌘Z undoes the action of the toast on screen.
 * - `nothing`: every other case.
 *
 * Outside the fields and editors, the key never reaches the browser. Its own undo would reach the last field
 * edited, even after it lost the focus, and undo the text there behind the page's back. ⌘ and Ctrl both
 * count, because the browser undoes with the key of the system it runs on, which a page can't always tell.
 */
export function undoKeyAction(press: KeyPress, target: KeyTarget, apple: boolean) {
  if (press.altKey || !(press.metaKey || press.ctrlKey)) return null;
  const key = press.key.toLowerCase();
  const redo = (key === 'z' && press.shiftKey) || (key === 'y' && !apple && press.ctrlKey && !press.shiftKey);
  if (key !== 'z' && !redo) return null;
  if (target.editable || target.inDrawing) return 'native';
  return !redo && !target.inOverlay && commandKey(press, apple) ? 'toast' : 'nothing';
}

/**
 * ⌘⌥T (Ctrl+Alt+T off Apple platforms): a task from the excerpt selected in the document, which works in the
 * editor too, being a modifier shortcut, but never in the drawing editor (docs/etapas/11-documento-desenho.md,
 * "Teclado e Esc").
 */
export const isCreateTaskKey = (press: KeyPress, target: KeyTarget, apple: boolean) =>
  commandKey(press, apple) &&
  press.altKey &&
  !press.shiftKey &&
  (press.code === 'KeyT' || press.key.toLowerCase() === 't') &&
  !target.inDrawing;
