/**
 * The latest change started on each item, as a move between folders or projects, so an undo applies only to
 * its own change: a newer change of the same item supersedes the toast that offered it, which loses its
 * Desfazer (`drop`), and an undo checks it is still the latest before it runs. An entry goes once nothing can
 * undo its change any more (`release`), so the map holds only the changes a toast still offers. The app keeps
 * one for its lifetime (shell/item-changes.tsx).
 */
export function createItemChanges() {
  const latest = new Map<string, { change: number; drop?: (() => void) | undefined }>();
  let next = 0;
  return {
    /** A change of `key` starts: the toast of the one before it can no longer undo. */
    begin(key: string) {
      latest.get(key)?.drop?.();
      next += 1;
      latest.set(key, { change: next });
      return next;
    },
    /** The toast of `change` offers an undo; `drop` takes it back when a newer change comes. */
    offer(key: string, change: number, drop: () => void) {
      const entry = latest.get(key);
      if (entry?.change === change) entry.drop = drop;
      else drop();
    },
    /** Whether `change` is still the latest change of `key`. */
    isLatest: (key: string, change: number) => latest.get(key)?.change === change,
    /** Nothing can undo `change` any more, as its toast left or its undo ran: its entry goes, if still its. */
    release(key: string, change: number) {
      if (latest.get(key)?.change === change) latest.delete(key);
    },
    /** How many items have a change a toast may still undo. */
    size: () => latest.size,
  };
}

export type ItemChanges = ReturnType<typeof createItemChanges>;
