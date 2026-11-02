/** Where held typing goes once the new document's page opens. */
export interface HeldTypingTarget {
  /** The new document's title: it takes the focus and, at its end, the text typed before any ↵. */
  title: HTMLTextAreaElement;
  /** The text typed after a ↵, which in the title takes the caret into the content. */
  toContent: (text: string) => void;
}

export interface HeldTyping {
  /** Hands what was typed to the new page, in order, and gives its title the focus. */
  release: (target: HeldTypingTarget) => void;
  /** Ends the hold with nothing handed on, as when the document was not made. */
  cancel: () => void;
}

/**
 * Holds what is typed between asking for a new document and its title taking the focus (validation of stage 11):
 * the page shown meanwhile is the one being left, and its title, its editor or its one-key shortcuts took the
 * keys, writing in the wrong document. `field` is a text field off screen that takes the focus at once and
 * again at every key, before the browser writes it, so the letters, ⌫, an accent's dead key or an input
 * method's composition all land there as typed; no other listener on the page hears the keys.
 */
export function holdTyping(field: HTMLTextAreaElement): HeldTyping {
  const view = field.ownerDocument.defaultView ?? window;
  let composing = false;
  let ended = false;
  const take = () => {
    if (field.ownerDocument.activeElement !== field) field.focus({ preventScroll: true });
  };
  const keydown = (event: KeyboardEvent) => {
    event.stopImmediatePropagation();
    take();
    // Tab would take the focus off the field.
    if (event.key === 'Tab') event.preventDefault();
    // A dialog still closing, as the ⌘K palette, keeps the focus inside it: the key goes into the field by hand,
    // and not into the dialog's own field.
    else if (field.ownerDocument.activeElement !== field) {
      event.preventDefault();
      typeByHand(field, event);
    }
  };
  const compositionStart = () => {
    composing = true;
  };
  const compositionEnd = () => {
    composing = false;
  };
  field.value = '';
  view.addEventListener('keydown', keydown, true);
  field.addEventListener('compositionstart', compositionStart);
  field.addEventListener('compositionend', compositionEnd);
  take();
  const end = () => {
    ended = true;
    view.removeEventListener('keydown', keydown, true);
    field.removeEventListener('compositionstart', compositionStart);
    field.removeEventListener('compositionend', compositionEnd);
    const text = field.value;
    field.value = '';
    return text;
  };
  return {
    release(target) {
      if (ended) return;
      const deliver = () => handOn(target, end());
      // A composition in progress finishes in the field first, as the person sees it.
      if (composing) field.addEventListener('compositionend', () => queueMicrotask(deliver), { once: true });
      else deliver();
    },
    cancel() {
      if (ended) return;
      end();
      field.blur();
    },
  };
}

/** A key the field could not take itself: a character, ↵ or ⌫ at its caret, as it would have written them. */
function typeByHand(field: HTMLTextAreaElement, event: KeyboardEvent) {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  // A character, from Shift, ⌥ or AltGr too; not a ⌘ or Ctrl shortcut.
  const typed = event.key.length === 1 && !event.metaKey && !(event.ctrlKey && !event.altKey);
  if (typed || event.key === 'Enter') field.setRangeText(typed ? event.key : '\n', start, end, 'end');
  else if (event.key === 'Backspace' && (start !== end || start > 0))
    field.setRangeText('', start === end ? start - 1 : start, end, 'end');
}

/** The text before the first ↵ at the title's end, the rest into the content; the title or the content keeps the focus. */
function handOn({ title, toContent }: HeldTypingTarget, text: string) {
  const [head = '', ...rest] = text.split('\n');
  title.focus({ preventScroll: true });
  const end = title.value.length;
  title.setSelectionRange(end, end);
  if (head) {
    title.setRangeText(head, end, end, 'end');
    // The input event a typed letter makes, which the title's own change handler reads.
    const InputEvent = title.ownerDocument.defaultView?.Event ?? Event;
    title.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
  if (rest.length) toContent(rest.join('\n'));
}
