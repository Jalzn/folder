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

export function describeTarget(target: EventTarget | null): KeyTarget {
  const element = target instanceof Element ? target : null;
  return {
    editable: Boolean(element?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')),
    inDrawing: Boolean(element?.closest('.excalidraw')),
    inOverlay: Boolean(element?.closest('[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]')),
  };
}

/** ⌘ on Apple platforms, Ctrl elsewhere. */
export const commandKey = (press: KeyPress, apple: boolean) => (apple ? press.metaKey : press.ctrlKey);

/**
 * Single keys and G chords work only outside text fields, the drawing editor and open menus or dialogs, and
 * without modifiers (Shift aside, for "?").
 */
export function acceptsPlainKey(press: KeyPress, target: KeyTarget) {
  return (
    !target.editable && !target.inDrawing && !target.inOverlay && !press.metaKey && !press.ctrlKey && !press.altKey
  );
}

/** ⌘K works anywhere but inside the drawing editor. */
export const acceptsPalette = (target: KeyTarget) => !target.inDrawing;
