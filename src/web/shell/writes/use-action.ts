import { useState } from 'react';
import { errorMessage, refreshWorkspace } from '../../lib/api';
import { createWriteQueue } from '../../lib/write-queue';
import { useToast } from '../../ui';

export interface RunOptions {
  /** Waits for the write in progress instead of being refused, as an undo: it is never lost. */
  queued?: boolean;
  /** The words of a failure, instead of the server's. */
  failure?: string;
}

/**
 * Runs one workspace write at a time: refreshes the workspace queries afterwards and shows a failure as an
 * error toast. Returns undefined when the write failed, or when another one was running and this one was
 * not `queued`.
 */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [queue] = useState(createWriteQueue);
  function run<T>(
    work: () => Promise<T>,
    success?: (value: T) => void,
    options: RunOptions = {},
  ): Promise<T | undefined> {
    const attempt = async () => {
      setBusy(true);
      try {
        const value = await work();
        await refreshWorkspace();
        success?.(value);
        return value;
      } catch (error) {
        toast(options.failure ?? errorMessage(error), 'error');
        await refreshWorkspace();
        return undefined;
      } finally {
        setBusy(false);
      }
    };
    return (options.queued ? queue.after(attempt) : queue.start(attempt)) ?? Promise.resolve(undefined);
  }
  return { busy, run };
}

/** What useAction returns: one write at a time, with its own queue for each component that calls it. */
export type WriteRunner = ReturnType<typeof useAction>;
