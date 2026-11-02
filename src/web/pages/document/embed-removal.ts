/** What putting a removed block back needs of the editor, so it reads without one. */
export interface BlockPlace<B extends { id: string }> {
  has(id: string): boolean;
  insertAfter(block: B, referenceId: string): void;
  insertBefore(block: B, referenceId: string): void;
  /** Puts the block at this index of the document's top level, or last when the index is past its end. */
  insertAt(block: B, index: number): void;
}

/** Where a removed block was: the blocks before and after it, and its index at the document's top level. */
export interface RemovedPlace {
  previousId: string | null;
  nextId: string | null;
  index: number;
}

/**
 * Desfazer of "Remover" (docs/etapas/11-documento-desenho.md, decision 10): the block comes back with its
 * ID, right after the block that came before it; when that one is gone too, right before the block that
 * came after it; with both gone, at the index it had, or last when the document got shorter (review B1),
 * never at the top for that alone. When the editor's ⌘Z already brought it back, the block's ID is in the
 * document, and nothing happens. True when it came back.
 */
export function putBackRemoved<B extends { id: string }>(place: BlockPlace<B>, removed: B, where: RemovedPlace) {
  if (place.has(removed.id)) return false;
  if (where.previousId && place.has(where.previousId)) place.insertAfter(removed, where.previousId);
  else if (where.nextId && place.has(where.nextId)) place.insertBefore(removed, where.nextId);
  else place.insertAt(removed, where.index);
  return true;
}
