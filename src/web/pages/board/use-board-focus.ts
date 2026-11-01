import { type FocusEvent, type RefObject, useState } from 'react';
import { cachedTasks } from '../../lib/queries';
import { pageTitle, whenPresent } from '../../ui';
import type { BoardFocus, BoardLayout } from './board-keys';
import type { createRefs } from './board-refs';
import { boardFocusOf } from './use-board-keyboard';

type Refs = ReturnType<typeof createRefs<HTMLButtonElement>>;

/**
 * Runs at once when the element is there, as a card the arrows reach; otherwise once it shows, and only after
 * a closing dialog gave its focus back, as the one that deleted a column.
 */
function soon<T>(find: () => T | null | undefined, found: (value: T) => void) {
  const look = () => (document.querySelector('.modal-overlay') ? null : find());
  const now = look();
  if (now == null) return whenPresent(look, found);
  found(now);
  return () => undefined;
}

/** Nothing has the focus, or only the page's title, where a lost focus falls back. */
const lost = () => {
  const active = document.activeElement;
  return !active || active === document.body || !active.isConnected || active === pageTitle();
};

/**
 * The board's focus (docs/etapas/10-quadro-tarefa.md, decision 10): one Tab stop, the card or column's name
 * that had the focus last, or the first card, and the moves of the focus by reference to a card or a name once
 * it shows, as a card that moved to another column and mounted again there.
 */
export function useBoardFocus({
  projectId,
  layout,
  titles,
  names,
  row,
}: {
  projectId: string;
  layout: BoardLayout;
  titles: Refs;
  names: Refs;
  row: RefObject<HTMLElement | null>;
}) {
  const [focus, setFocus] = useState<BoardFocus | null>(null);

  /**
   * The focus goes to a card once it shows in its column: `always`, or when the board had the focus or nothing
   * has it, so a card moved by the mouse does not take the focus from elsewhere.
   */
  function followCard(id: string, columnId?: string, always = false) {
    setFocus({ kind: 'card', id });
    const column = columnId ?? cachedTasks(projectId)?.tasks.find((task) => task.id === id)?.columnId;
    return soon(
      () => {
        const title = titles.get(id);
        const section = title?.closest('[data-column-id]');
        return title && (!column || section?.getAttribute('data-column-id') === column) ? title : null;
      },
      (title) => {
        const inBoard = row.current?.contains(document.activeElement) ?? false;
        if ((always || inBoard || lost()) && document.activeElement !== title) title.focus({ preventScroll: true });
        title.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      },
    );
  }

  /** The focus goes to a column's name: `always`, or only when nothing has it, as after a rename by leaving. */
  function followColumn(id: string, always = true) {
    setFocus({ kind: 'column', id });
    return soon(
      () => names.get(id),
      (name) => {
        if (always || lost()) name.focus({ preventScroll: true });
        name.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      },
    );
  }

  const cards = layout.columns.flatMap((column) => column.cards);
  const first = layout.columns[0];
  const kept =
    focus &&
    (focus.kind === 'card' ? cards.includes(focus.id) : layout.columns.some((column) => column.id === focus.id));
  const stop: BoardFocus | null = kept
    ? focus
    : cards[0]
      ? { kind: 'card', id: cards[0] }
      : first
        ? { kind: 'column', id: first.id }
        : null;

  return {
    followCard,
    followColumn,
    /** Whether the card or name is the board's Tab stop. */
    isStop: (kind: BoardFocus['kind'], id: string) => stop?.kind === kind && stop.id === id,
    /** The row's onFocus: a card or name that takes the focus, by the mouse too, becomes the stop. */
    onFocus: (event: FocusEvent<HTMLElement>) => {
      const next = boardFocusOf(event.target);
      if (next) setFocus(next);
    },
  };
}
