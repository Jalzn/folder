/**
 * The order of `ids` with `id` moved before `beforeId`, or to the end when `beforeId` is null.
 * Undefined when either is not in the list, or when they are the same.
 */
export function reorder(ids: readonly string[], id: string, beforeId: string | null): string[] | undefined {
  if (!ids.includes(id) || id === beforeId) return undefined;
  const others = ids.filter((other) => other !== id);
  const index = beforeId === null ? others.length : others.indexOf(beforeId);
  if (index < 0) return undefined;
  return [...others.slice(0, index), id, ...others.slice(index)];
}

/** Where a restored folder or column goes back: the position it had, or the end when fewer remain. */
export function restoredPosition(position: number, activeCount: number): number {
  return Math.min(Math.max(position, 0), activeCount);
}

export const compareCodeUnits = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export const byPosition = (a: { position: number }, b: { position: number }): number => a.position - b.position;
export function reorderById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  beforeId: string | null,
): T[] | undefined {
  const order = reorder(
    items.map((item) => item.id),
    id,
    beforeId,
  );
  if (!order) return undefined;
  const byId = new Map(items.map((item) => [item.id, item]));
  return order.flatMap((id) => byId.get(id) ?? []);
}
