import { errorCode } from './errors';
import type { ItemChanges } from './item-changes';

/** What a change shows once it is done: its toast and, while the toast is on screen, its undo. */
export interface ChangeToast {
  text: string;
  /** Without it, the toast has no Desfazer. */
  undo?: (() => Promise<unknown>) | undefined;
  /**
   * What an undo says when the server finds the object changed since (VERSION_CONFLICT). Without it, that
   * failure goes to the error toast, as any other, as for the moves between folders and projects.
   */
  changed?: string | undefined;
  /** After the undo, once the workspace read again, as for the focus of a card that came back. */
  undone?: (() => void) | undefined;
}

/** What the protocol works with: the write queue, the toast, the announcer and the items' latest changes. */
export interface UndoableChangeDeps {
  run: <T>(
    work: () => Promise<T>,
    success?: (value: T) => void,
    options?: { queued?: boolean },
  ) => Promise<T | undefined>;
  toast: (text: string, options?: { undo: () => unknown; onUndoGone: () => void }) => number;
  announce: (text: string) => void;
  withdrawUndo: (toastId: number) => void;
  changes: ItemChanges;
  /** What an undo says when a newer change of the same object came first. */
  superseded: string;
}

/**
 * A change of one object, as `task:<id>` or `column:<id>`, with the toast that offers its undo
 * (docs/etapas/09-pastas.md, "Desfazer"): the change begins once the write queue takes it, a newer change of
 * the same object takes the Desfazer of the toast before, and an undo waits for the write in progress and
 * checks it is still the latest before it runs. Resolves to the write's answer, or undefined when it failed.
 * `queued` waits for the write in progress instead of being refused, as the board's moves do.
 */
export async function runUndoableChange<T>(
  deps: UndoableChangeDeps,
  key: string,
  write: () => Promise<T>,
  done: (value: T) => ChangeToast | null,
  { queued = false }: { queued?: boolean } = {},
): Promise<T | undefined> {
  const { run, toast, announce, withdrawUndo, changes, superseded } = deps;
  let begun = 0;
  const value = await run(
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
      if (!changes.isLatest(key, begun)) return announce(superseded);
      const undoing = changes.begin(key);
      return run(
        async () => {
          try {
            // A change that came while this undo waited behind another write wins.
            if (!changes.isLatest(key, undoing)) return announce(superseded);
            await undo();
            return true;
          } catch (error) {
            if (changed === undefined || errorCode(error) !== 'VERSION_CONFLICT') throw error;
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
}
