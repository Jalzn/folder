/**
 * The row ⌘K's Enter runs: the highlighted one while it is a row of the list on screen, otherwise the first;
 * none when the list is empty. A highlight left on a row of an earlier list never runs.
 */
export function enterRow(order: readonly string[], highlighted: string | null): string | null {
  if (highlighted !== null && order.includes(highlighted)) return highlighted;
  return order[0] ?? null;
}
