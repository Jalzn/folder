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
