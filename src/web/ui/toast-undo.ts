/** An undo and the toast that offers it. */
interface Offer {
  toastId: number;
  undo: () => unknown;
}

/**
 * The undo of the toast on screen, for ⌘Z (docs/etapas/09-pastas.md, "Desfazer"). A newer toast replaces it,
 * with its own undo or none, and it goes as soon as its toast starts leaving: ⌘Z never undoes something the
 * person can no longer see.
 */
export function createUndoSlot() {
  let offer: Offer | null = null;
  return {
    /** A toast is shown, offering `undo` or nothing. */
    show(toastId: number, undo?: () => unknown) {
      offer = undo ? { toastId, undo } : null;
    },
    /** That toast leaves: its undo goes with it, but a newer toast's stays. */
    leave(toastId: number) {
      if (offer?.toastId === toastId) offer = null;
    },
    /** That toast's change was superseded by a newer one: its undo goes, but a newer toast's stays. */
    withdraw(toastId: number) {
      if (offer?.toastId === toastId) offer = null;
    },
    /** The toast whose undo is on offer, if any. */
    offeredBy: () => offer?.toastId ?? null,
    /** Takes the undo on offer, once. */
    take(): (() => unknown) | null {
      const taken = offer;
      offer = null;
      return taken?.undo ?? null;
    },
  };
}
