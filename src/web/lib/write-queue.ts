/**
 * One write at a time, for useAction. `start` refuses a write while another runs, so a second click does
 * nothing; `after` waits for the one in progress to settle and then runs, so an undo pressed during another
 * write is never lost.
 */
export function createWriteQueue() {
  let running: Promise<unknown> | null = null;
  function begin<T>(work: () => Promise<T>): Promise<T> {
    const started = work();
    const settled = started.then(
      () => undefined,
      () => undefined,
    );
    running = settled;
    void settled.then(() => {
      if (running === settled) running = null;
    });
    return started;
  }
  return {
    get busy() {
      return running !== null;
    },
    /** Runs the write now, or refuses it with null while another one runs. */
    start<T>(work: () => Promise<T>): Promise<T> | null {
      return running ? null : begin(work);
    },
    /** Runs the write once the ones in progress have settled. */
    async after<T>(work: () => Promise<T>): Promise<T> {
      while (running) await running;
      return begin(work);
    },
  };
}
