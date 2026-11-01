/** What putting a removed block back needs of the editor, so it reads without one. */
export interface BlockPlace<B extends { id: string }> {
  has(id: string): boolean;
  insertAfter(block: B, referenceId: string): void;
  insertFirst(block: B): void;
}

/**
 * Desfazer of "Remover" (docs/etapas/11-documento-desenho.md, decision 10): the block comes back with its
 * ID, right after the block that came before it, or first when that one is gone too. When the editor's ⌘Z
 * already brought it back, the block's ID is in the document, and nothing happens. True when it came back.
 */
export function putBackRemoved<B extends { id: string }>(place: BlockPlace<B>, removed: B, previousId: string | null) {
  if (place.has(removed.id)) return false;
  if (previousId && place.has(previousId)) place.insertAfter(removed, previousId);
  else place.insertFirst(removed);
  return true;
}
