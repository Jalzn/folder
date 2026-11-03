import type { KeyboardEvent } from 'react';
import { usesCommandKey } from '../../lib/platform';
import { isTextTarget } from '../../shell/keyboard';
import { type BoardFocus, type BoardKeyAction, type BoardLayout, boardKey, type KeyPress } from './board-keys';

/** Marks a card's title button and a column's name, the board's two kinds of focus. */
export const CARD_ATTRIBUTE = 'data-board-card';
export const COLUMN_ATTRIBUTE = 'data-board-column';

/** What the focus is on, from the focused element: a card's title or a column's name. */
export function boardFocusOf(target: EventTarget | null): BoardFocus | null {
  if (!(target instanceof HTMLElement)) return null;
  const card = target.getAttribute(CARD_ATTRIBUTE);
  if (card) return { kind: 'card', id: card };
  const column = target.getAttribute(COLUMN_ATTRIBUTE);
  return column ? { kind: 'column', id: column } : null;
}

/**
 * The board's `onKeyDown` (docs/etapas/10-quadro-tarefa.md, "Teclado do quadro"): on a card or a column's name,
 * the key that `board-keys.ts` gives an action goes to `act`, and the page and the shortcuts never see it. It
 * never acts on an editable target, as the column's name being typed, and P does nothing on a card: tasks are
 * not pinned.
 */
export function useBoardKeyboard(
  layout: () => BoardLayout,
  act: (action: BoardKeyAction, focus: BoardFocus, press: KeyPress) => void,
) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing || !(event.target instanceof HTMLElement) || isTextTarget(event.target)) return;
    const focus = boardFocusOf(event.target);
    if (!focus) return;
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey;
    if (focus.kind === 'card' && plain && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      return;
    }
    const action = boardKey(layout(), focus, event, usesCommandKey());
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    act(action, focus, event);
  };
}
