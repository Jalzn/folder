import { useEffect } from 'react';
import { type AutosaveController, watchPage } from './autosave';

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
    const stop = watchPage(controller, { window, document }, { keep, retryOnHide: false });
    if (controller.getState().recovered && controller.getState().status !== 'conflict') void controller.flush();
    return () => {
      stop();
      if (controller.getState().status !== 'saved') keep();
      if (!settled(controller.getState().status)) void controller.flush();
    };
  }, [controller, persistDraft]);
}
