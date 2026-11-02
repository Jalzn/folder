/**
 * A task that runs one at a time, as an import: a call while one runs is ignored and answers false; the next
 * one runs once it ended, however it ended.
 */
export function oneAtATime() {
  let busy = false;
  return async (work: () => Promise<void>) => {
    if (busy) return false;
    busy = true;
    try {
      await work();
      return true;
    } finally {
      busy = false;
    }
  };
}
