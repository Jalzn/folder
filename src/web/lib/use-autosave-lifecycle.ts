import { useEffect } from 'react';
import type { AutosaveController } from './autosave';

const settled = (status: string) => ['saved', 'error', 'conflict'].includes(status);

/**
 * What an open editor does around its autosave: retries a failed save when the connection returns, warns
 * before leaving with unsaved work, saves when the tab is hidden, sends a recovered draft, and saves once
 * more when the editor closes. `persistDraft` also writes the local draft at those moments, for editors
 * that keep it on a delay.
 */
export function useAutosaveLifecycle<T>(controller: AutosaveController<T>, { persistDraft = false } = {}) {
  useEffect(() => {
    const keep = () => {
      if (persistDraft) controller.persistDraft();
    };
    const retry = () => {
      if (controller.getState().status === 'error') void controller.flush();
    };
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (controller.getState().status === 'saved') return;
      keep();
      event.preventDefault();
      event.returnValue = '';
    };
    const hidden = () => {
      keep();
      if (document.visibilityState === 'hidden' && !['error', 'conflict'].includes(controller.getState().status))
        void controller.flush();
    };
    window.addEventListener('online', retry);
    window.addEventListener('beforeunload', beforeLeave);
    document.addEventListener('visibilitychange', hidden);
    if (controller.getState().recovered && controller.getState().status !== 'conflict') void controller.flush();
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener('beforeunload', beforeLeave);
      document.removeEventListener('visibilitychange', hidden);
      if (controller.getState().status !== 'saved') keep();
      if (!settled(controller.getState().status)) void controller.flush();
    };
  }, [controller, persistDraft]);
}
