import { api, errorCode, queryClient, requestId } from '../../lib/api';
import { keys, useProjects } from '../../lib/queries';
import { displayTitle, type ItemType } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { useToast, useWithdrawUndo } from '../../ui';
import { useAnnounce } from '../announcer';
import { backToRootText } from '../folders/folder-text';
import { moveToFolder } from '../folders/move-to-folder';
import { UNDO_SUPERSEDED } from '../folders/use-move-to-folder';
import { useItemChanges } from '../item-changes';
import { moveItem } from './move-item';

/**
 * Moves a document or drawing to another project, through its open editor when it has one. The toast
 * "“X” foi para Y." offers Desfazer, which moves it back, into the folder it came from (or at the root, saying
 * so, when that folder was deleted meanwhile), and pins it again when there is room; a newer change of the
 * item takes it away, as for a move between folders.
 */
export function useMoveItem() {
  const projects = useProjects(true).data ?? [];
  const action = useAction();
  const toast = useToast();
  const announce = useAnnounce();
  const withdrawUndo = useWithdrawUndo();
  const changes = useItemChanges();
  // A retried move sends the same request, so the server replays it instead of refusing a stale version.
  const request = useRequest();
  const undoRequest = useRequest();
  /** Resolves true once the item moved. */
  async function move(type: ItemType, id: string, from: string, to: string) {
    if (to === from) return false;
    const key = `${type}:${id}`;
    // The change begins once the write is accepted, as for a move between folders.
    let begun = 0;
    const moved = await action.run(() => {
      begun = changes.begin(key);
      return moveItem(type, id, to, request.for);
    });
    if (!begun) return false;
    if (!moved) {
      changes.release(key, begun);
      return false;
    }
    request.clear();
    void queryClient.invalidateQueries({ queryKey: keys.item(type, id) });
    const destination = projects.find((project) => project.id === to)?.name ?? 'outro projeto';
    const source = projects.find((project) => project.id === from)?.name ?? 'o projeto de origem';
    const intoFolder = requestId();
    const toastId = toast(`“${displayTitle(moved.title)}” foi para ${destination}.`, {
      undo: () => {
        if (!changes.isLatest(key, begun)) return announce(UNDO_SUPERSEDED);
        const undoing = changes.begin(key);
        return action.run(
          async () => {
            try {
              if (!changes.isLatest(key, undoing)) return announce(UNDO_SUPERSEDED);
              await moveItem(type, id, from, undoRequest.for);
              undoRequest.clear();
              // A project move leaves the item at the root: then back into its folder, if it is still there.
              if (moved.folderId)
                await moveToFolder(type, id, from, moved.folderId, intoFolder).catch((error: unknown) => {
                  if (errorCode(error) !== 'NOT_FOUND') throw error;
                  toast(backToRootText(displayTitle(moved.title), source));
                });
              // A full project or folder keeps the item unpinned.
              if (moved.pinned) await api.workspace.pinItem({ type, id }).catch(() => undefined);
            } finally {
              changes.release(key, undoing);
            }
          },
          undefined,
          { queued: true },
        );
      },
      onUndoGone: () => changes.release(key, begun),
    });
    changes.offer(key, begun, () => withdrawUndo(toastId));
    return true;
  }
  return { busy: action.busy, move };
}
