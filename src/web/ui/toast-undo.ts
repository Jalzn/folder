/** An undo and the toast that offers it. */
interface Offer {
  toastId: number;
  undo: () => unknown;
  /** Its undo can no longer run: the toast left, a newer toast came, or a newer change withdrew it. */
  gone?: (() => void) | undefined;
}

/**
 * The undo of the toast on screen, for ⌘Z (docs/etapas/09-pastas.md, "Desfazer"). A newer toast replaces it,
 * with its own undo or none, and it goes as soon as its toast starts leaving: ⌘Z never undoes something the
 * person can no longer see.
 */
export function createUndoSlot() {
  let offer: Offer | null = null;
  /** The offer goes without its undo running. */
  const lose = () => {
    const lost = offer;
    offer = null;
    lost?.gone?.();
  };
  return {
    /** A toast is shown, offering `undo` or nothing; `gone` is told when that undo can no longer run. */
    show(toastId: number, undo?: () => unknown, gone?: () => void) {
      lose();
      offer = undo ? { toastId, undo, gone } : null;
    },
    /** That toast leaves: its undo goes with it, but a newer toast's stays. */
    leave(toastId: number) {
      if (offer?.toastId === toastId) lose();
    },
    /** That toast's change was superseded by a newer one: its undo goes, but a newer toast's stays. */
    withdraw(toastId: number) {
      if (offer?.toastId === toastId) lose();
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
