import { errorCode } from '../lib/api';
import type { WriteRunner } from '../lib/use-action';
import { useToast, useWithdrawUndo } from '../ui';
import { useAnnounce } from './announcer';
import { useItemChanges } from './item-changes';

type Action = WriteRunner;

/** What a change shows once it is done: its toast and, while the toast is on screen, its undo. */
export interface ChangeToast {
  text: string;
  /** Without it, or without `complete`, the toast has no Desfazer. */
  undo?: (() => Promise<unknown>) | undefined;
  /** What an undo says when the server finds the object changed since (VERSION_CONFLICT). */
  changed: string;
  /** After the undo, once the workspace read again, as for the focus of a card that came back. */
  undone?: (() => void) | undefined;
}

/** What an undo says when a newer change of the same object came first. */
const CHANGED_LATER = 'Mudou depois; nada foi desfeito.';

/**
 * A change of one object, as `task:<id>` or `column:<id>`, with the toast that offers its undo
 * (docs/etapas/09-pastas.md, "Desfazer"): the change begins once the write queue takes it, a newer change of
 * the same object takes the Desfazer of the toast before, and an undo waits for the write in progress and
 * checks it is still the latest before it runs. Resolves to the write's answer, or undefined when it failed.
 * `queued` waits for the write in progress instead of being refused, as the board's moves do.
 */
export function useUndoableChange(action: Action) {
  const toast = useToast();
  const announce = useAnnounce();
  const withdrawUndo = useWithdrawUndo();
  const changes = useItemChanges();
  return async function change<T>(
    key: string,
    write: () => Promise<T>,
    done: (value: T) => ChangeToast | null,
    { queued = false }: { queued?: boolean } = {},
  ): Promise<T | undefined> {
    let begun = 0;
    const value = await action.run(
      () => {
        begun = changes.begin(key);
        return write();
      },
      undefined,
      { queued },
    );
    if (!begun) return undefined;
    const shown = value === undefined ? null : done(value);
    if (!shown?.undo) {
      changes.release(key, begun);
      if (shown) toast(shown.text);
      return value;
    }
    const { undo, changed, undone } = shown;
    const toastId = toast(shown.text, {
      undo: () => {
        if (!changes.isLatest(key, begun)) return announce(CHANGED_LATER);
        const undoing = changes.begin(key);
        return action.run(
          async () => {
            try {
              // A change that came while this undo waited behind another write wins.
              if (!changes.isLatest(key, undoing)) return announce(CHANGED_LATER);
              await undo();
              return true;
            } catch (error) {
              if (errorCode(error) !== 'VERSION_CONFLICT') throw error;
              toast(changed);
            } finally {
              changes.release(key, undoing);
            }
          },
          (ran) => ran && undone?.(),
          { queued: true },
        );
      },
      onUndoGone: () => changes.release(key, begun),
    });
    changes.offer(key, begun, () => withdrawUndo(toastId));
    return value;
  };
}
