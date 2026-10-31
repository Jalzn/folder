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
