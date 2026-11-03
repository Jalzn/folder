import { type ChangeToast, runUndoableChange } from '../../lib/writes/undoable-change';
import { useToast, useWithdrawUndo } from '../../ui';
import { useAnnounce } from '../announcer';
import { useItemChanges } from './item-changes';
import type { WriteRunner } from './use-action';

export type { ChangeToast };

/** What an undo says when a newer change of the same object came first. */
const CHANGED_LATER = 'Mudou depois; nada foi desfeito.';

/**
 * A change of one object with the toast that offers its undo, run by `action` (lib/undoable-change.ts).
 * `superseded` is what an undo says when a newer change of the object came first. Deleting a folder and
 * archiving a project keep their own undo: through this, a newer change would take their Desfazer away.
 */
export function useUndoableChange(action: WriteRunner, { superseded = CHANGED_LATER }: { superseded?: string } = {}) {
  const toast = useToast();
  const announce = useAnnounce();
  const withdrawUndo = useWithdrawUndo();
  const changes = useItemChanges();
  return function change<T>(
    key: string,
    write: () => Promise<T>,
    done: (value: T) => ChangeToast | null,
    options: { queued?: boolean } = {},
  ): Promise<T | undefined> {
    return runUndoableChange(
      { run: action.run, toast, announce, withdrawUndo, changes, superseded },
      key,
      write,
      done,
      options,
    );
  };
}
