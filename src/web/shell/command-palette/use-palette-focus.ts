import { type KeyboardEvent, type RefObject, useEffect } from 'react';
import { whenPresent } from '../../ui';
import { enterRow } from './palette-focus';

/** The key of the row React Aria highlights in the list, if it is on screen. */
const highlightedIn = (list: HTMLElement | null) =>
  list?.querySelector<HTMLElement>('[role="menuitem"][data-focused]')?.dataset.key ?? null;

/** The keys of the rows the list draws, in order: React Aria draws a new list a render after it is given. */
const drawnIn = (list: HTMLElement) =>
  [...list.querySelectorAll<HTMLElement>('[role="menuitem"]')].map((row) => row.dataset.key ?? '').join('\n');

/**
 * Keeps ⌘K's highlight and Enter on the list on screen. React Aria highlights the first row as the text is
 * typed, but not when the item search answers later and replaces the rows: the highlight stayed on a row that
 * was gone, and Enter ran nothing, or that row while it was still there. Now, whenever the rows change with
 * text typed and no usable row highlighted, the first usable row takes the highlight, and Enter runs the
 * highlighted usable row, or the first, or nothing when there is none. The arrows stay React Aria's.
 */
export function usePaletteFocus({
  list,
  rows,
  usable,
  typed,
  onRun,
}: {
  list: RefObject<HTMLElement | null>;
  /** The keys of every row on screen, in their order. */
  rows: readonly string[];
  /** Those that can run: not the items of an earlier text, which stay in place, dimmed. */
  usable: readonly string[];
  typed: boolean;
  onRun: (key: string) => void;
}) {
  const drawn = rows.join('\n');
  const runnable = usable.join('\n');
  useEffect(() => {
    if (!typed || runnable === '') return;
    const keys = runnable.split('\n');
    return whenPresent(
      () => {
        const element = list.current;
        return element && drawnIn(element) === drawn ? element : null;
      },
      (element) => {
        const highlighted = highlightedIn(element);
        if (highlighted !== null && keys.includes(highlighted)) return;
        // The list takes the virtual focus, as when the field gets the focus back, and Home moves the highlight
        // to its first usable row: React Aria's own keys, so the input's active descendant follows.
        element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        element.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      },
      { frames: 30 },
    );
  }, [list, drawn, runnable, typed]);

  /** The field's Enter, before React Aria's, which would act on whatever row it still has in mind. */
  const onKeyDownCapture = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    const key = enterRow(usable, highlightedIn(list.current));
    if (key !== null) onRun(key);
  };
  return { onKeyDownCapture };
}
