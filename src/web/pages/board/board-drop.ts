/**
 * Where a card dragged on the board lands (docs/etapas/10-quadro-tarefa.md, "Arrastar"), from the columns'
 * boxes and the pointer: the column under it, and the first card whose middle is below the pointer, or the
 * column's end. Dropping the card where it already is changes nothing.
 */

export interface DropColumn {
  id: string;
  left: number;
  right: number;
  /** Its cards in order, with their top and bottom. */
  cards: readonly { id: string; top: number; bottom: number }[];
}

export interface DropSpot {
  columnId: string;
  /** The card the dragged one goes before, or null for the column's end. */
  beforeTaskId: string | null;
  /** The card would stay where it is. */
  same: boolean;
}

export function boardDrop(
  columns: readonly DropColumn[],
  point: { x: number; y: number },
  dragged: string,
): DropSpot | null {
  const column = columns.find((each) => point.x >= each.left && point.x <= each.right);
  if (!column) return null;
  const at = column.cards.findIndex((card) => point.y < (card.top + card.bottom) / 2);
  const before = at < 0 ? null : (column.cards[at]?.id ?? null);
  const own = column.cards.findIndex((card) => card.id === dragged);
  // Right before itself, or right after it (before the next card, or the end when it is last).
  const same = own >= 0 && (before === dragged || (at < 0 ? own === column.cards.length - 1 : at === own + 1));
  return { columnId: column.id, beforeTaskId: before === dragged ? (column.cards[own + 1]?.id ?? null) : before, same };
}
