/**
 * The latest change started on each item, as a move between folders or projects, so an undo applies only to
 * its own change: a newer change of the same item supersedes the toast that offered it, which loses its
 * Desfazer (`drop`), and an undo checks it is still the latest before it runs.
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
  };
}

/** The app's changes of documents and drawings, by "document:<id>". */
export const itemChanges = createItemChanges();
