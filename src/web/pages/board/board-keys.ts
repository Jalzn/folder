/**
 * The board's keys (docs/etapas/10-quadro-tarefa.md, "Teclado do quadro"), as a pure function of the board's
 * layout and of what has the focus: one Tab stop, the arrows between cards and columns, ⇧ and the arrows to
 * move, and the menus. It never acts on an editable target; the caller checks that.
 */

/** What the board's focus is on: a card, or a column's name. */
export type BoardFocus = { kind: 'card'; id: string } | { kind: 'column'; id: string };

/** The columns in order, each with its cards' ids in order. */
export interface BoardLayout {
  columns: readonly { id: string; cards: readonly string[] }[];
}

export interface KeyPress {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}

export type BoardKeyAction =
  | { kind: 'focus'; target: BoardFocus }
  /** The card goes to `columnId`, at `index` of that column once it is there. */
  | { kind: 'move-card'; id: string; columnId: string; index: number; within: boolean }
  /** The column goes to `index` among the columns. */
  | { kind: 'move-column'; id: string; index: number }
  | { kind: 'say'; text: string }
  | { kind: 'move-menu'; id: string }
  | { kind: 'card-menu'; id: string }
  | { kind: 'column-menu'; id: string }
  | { kind: 'toggle-done'; id: string };

export const NO_COLUMN_THERE = 'Não há coluna nessa direção.';
export const AT_TOP = 'Já está no topo.';
export const AT_END = 'Já está no fim.';

/** Where a card is: its column's index and its own. */
function placeOf(layout: BoardLayout, id: string) {
  for (const [column, each] of layout.columns.entries()) {
    const row = each.cards.indexOf(id);
    if (row >= 0) return { column, row };
  }
  return null;
}

function cardKey(layout: BoardLayout, id: string, press: KeyPress, mod: boolean): BoardKeyAction | null {
  const place = placeOf(layout, id);
  if (!place) return null;
  const column = layout.columns[place.column];
  if (!column) return null;
  const { key, shiftKey } = press;
  if (mod && key === 'Enter') return { kind: 'toggle-done', id };
  if (mod || press.altKey) return null;
  if (key === 'ContextMenu' || (shiftKey && key === 'F10')) return { kind: 'card-menu', id };
  if (!shiftKey && key.toLowerCase() === 'm') return { kind: 'move-menu', id };
  if (shiftKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    const target = layout.columns[place.column + (key === 'ArrowRight' ? 1 : -1)];
    if (!target) return { kind: 'say', text: NO_COLUMN_THERE };
    return {
      kind: 'move-card',
      id,
      columnId: target.id,
      index: Math.min(place.row, target.cards.length),
      within: false,
    };
  }
  if (shiftKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
    const to = place.row + (key === 'ArrowDown' ? 1 : -1);
    if (to < 0) return { kind: 'say', text: AT_TOP };
    if (to >= column.cards.length) return { kind: 'say', text: AT_END };
    return { kind: 'move-card', id, columnId: column.id, index: to, within: true };
  }
  if (shiftKey) return null;
  if (key === 'ArrowDown') {
    const next = column.cards[place.row + 1];
    return next ? { kind: 'focus', target: { kind: 'card', id: next } } : null;
  }
  if (key === 'ArrowUp') {
    const previous = column.cards[place.row - 1];
    return { kind: 'focus', target: previous ? { kind: 'card', id: previous } : { kind: 'column', id: column.id } };
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const step = key === 'ArrowRight' ? 1 : -1;
    for (let at = place.column + step; at >= 0 && at < layout.columns.length; at += step) {
      const cards = layout.columns[at]?.cards ?? [];
      const card = cards[Math.min(place.row, cards.length - 1)];
      if (card) return { kind: 'focus', target: { kind: 'card', id: card } };
    }
    return null;
  }
  return null;
}

function columnKey(layout: BoardLayout, id: string, press: KeyPress, mod: boolean): BoardKeyAction | null {
  const at = layout.columns.findIndex((column) => column.id === id);
  if (at < 0 || mod || press.altKey) return null;
  const { key, shiftKey } = press;
  if (key === 'ContextMenu' || (shiftKey && key === 'F10')) return { kind: 'column-menu', id };
  if (shiftKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    const to = at + (key === 'ArrowRight' ? 1 : -1);
    if (to < 0 || to >= layout.columns.length) return { kind: 'say', text: NO_COLUMN_THERE };
    return { kind: 'move-column', id, index: to };
  }
  if (shiftKey) return null;
  if (key === 'ArrowDown') {
    const first = layout.columns[at]?.cards[0];
    return first ? { kind: 'focus', target: { kind: 'card', id: first } } : null;
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const next = layout.columns[at + (key === 'ArrowRight' ? 1 : -1)];
    return next ? { kind: 'focus', target: { kind: 'column', id: next.id } } : null;
  }
  return null;
}

/** What a key does on the board, from where the focus is; null leaves the key to the page. */
export function boardKey(
  layout: BoardLayout,
  focus: BoardFocus,
  press: KeyPress,
  apple: boolean,
): BoardKeyAction | null {
  const mod = apple ? press.metaKey : press.ctrlKey;
  return focus.kind === 'card' ? cardKey(layout, focus.id, press, mod) : columnKey(layout, focus.id, press, mod);
}

/** The card a move should go before: the one at `index` of the column once the moved card left it. */
export function beforeCardAt(layout: BoardLayout, id: string, columnId: string, index: number): string | null {
  const cards = (layout.columns.find((column) => column.id === columnId)?.cards ?? []).filter((card) => card !== id);
  return cards[index] ?? null;
}
