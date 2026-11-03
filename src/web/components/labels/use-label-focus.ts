import { useEffect, useRef } from 'react';
import type { LabelSummary } from '../../lib/queries';
import { useElementRefs, whenPresent } from '../../ui';
import type { RowStep } from './LabelRow';
export function useLabelFocus(list: readonly LabelSummary[]) {
  const rows = useElementRefs<HTMLLIElement>();
  const names = useElementRefs<HTMLButtonElement>();
  const body = useRef<HTMLDivElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  // One focus move waits at a time, and none outlives the dialog.
  const cancelFocus = useRef<() => void>(() => undefined);
  useEffect(() => () => cancelFocus.current(), []);
  function focusOnce(find: () => HTMLElement | null | undefined, when: () => boolean = () => true) {
    cancelFocus.current();
    cancelFocus.current = whenPresent(
      () => {
        const element = find();
        return element?.isConnected ? element : null;
      },
      (element) => {
        if (!when()) return;
        element.focus({ preventScroll: true });
        element.scrollIntoView({ block: 'nearest' });
      },
    );
  }
  const focusName = (id: string) => focusOnce(() => names.get(id));
  const focusAdd = () => focusOnce(() => add.current);

  function step(from: string, to: RowStep) {
    const at = list.findIndex((label) => label.id === from);
    const index = { previous: at - 1, next: at + 1, first: 0, last: list.length - 1 }[to];
    const target = list[Math.max(0, Math.min(index, list.length - 1))];
    if (target) names.get(target.id)?.focus();
  }

  return { rows, names, body, add, focusOnce, focusName, focusAdd, step };
}
