import { focusPageTitle } from './focus';

/** Once work an action started settles, a focus it left on nothing goes to the page's title. */
export const refocusAfter = (done: unknown) =>
  void Promise.resolve(done)
    .catch(() => undefined)
    .then(() => focusPageTitle());

/**
 * Runs a toast's action and puts the focus back where it was before it came into the toast, or on the page's
 * title when that is gone. The work may take that element away once it is done, as an undo that moves a
 * row's item out of the project: the focus then goes to the page's title, which only happens when it was lost.
 */
export function actFromToast(work: (() => unknown) | undefined, inToast: boolean, returnTo: HTMLElement | null) {
  const done = work?.();
  if (!inToast) return;
  if (returnTo?.isConnected) returnTo.focus();
  else focusPageTitle();
  refocusAfter(done);
}
