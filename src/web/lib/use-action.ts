import { useRef, useState } from 'react';
import { useToast } from '../ui';
import { errorMessage, refreshWorkspace, reportSessionError } from './api';

/**
 * Runs one workspace write at a time: refreshes the workspace queries afterwards and shows a failure as an
 * error toast. Returns undefined when the write failed or another one was running.
 */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  async function run<T>(work: () => Promise<T>, success?: (value: T) => void): Promise<T | undefined> {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const value = await work();
      await refreshWorkspace();
      success?.(value);
      return value;
    } catch (error) {
      reportSessionError(error);
      toast(errorMessage(error), 'error');
      await refreshWorkspace();
      return;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, run };
}
