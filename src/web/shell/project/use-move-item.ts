import { api, queryClient } from '../../lib/api';
import { itemChanges } from '../../lib/item-changes';
import { useProjects } from '../../lib/queries';
import { displayTitle, type ItemType } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { useToast, useWithdrawUndo } from '../../ui';
import { useAnnounce } from '../announcer';
import { UNDO_SUPERSEDED } from '../folders/use-move-to-folder';
import { moveItem } from './move-item';

/**
 * Moves a document or drawing to another project, through its open editor when it has one. The toast
 * "“X” foi para Y." offers Desfazer, which moves it back and pins it again when the project has room; a newer
 * change of the item takes it away, as for a move between folders.
 */
export function useMoveItem() {
  const projects = useProjects(true).data ?? [];
  const action = useAction();
  const toast = useToast();
  const announce = useAnnounce();
  const withdrawUndo = useWithdrawUndo();
  // A retried move sends the same request, so the server replays it instead of refusing a stale version.
  const request = useRequest();
  const undoRequest = useRequest();
  /** Resolves true once the item moved. */
  async function move(type: ItemType, id: string, from: string, to: string) {
    if (to === from) return false;
    const key = `${type}:${id}`;
    const change = itemChanges.begin(key);
    const moved = await action.run(() => moveItem(type, id, to, request.for));
    if (!moved) return false;
    request.clear();
    void queryClient.invalidateQueries({ queryKey: ['workspace', type === 'document' ? 'document' : 'canvas', id] });
    const destination = projects.find((project) => project.id === to)?.name ?? 'outro projeto';
    const toastId = toast(`“${displayTitle(moved.title)}” foi para ${destination}.`, {
      undo: () => {
        if (!itemChanges.isLatest(key, change)) return announce(UNDO_SUPERSEDED);
        const undoing = itemChanges.begin(key);
        return action.run(
          async () => {
            if (!itemChanges.isLatest(key, undoing)) return announce(UNDO_SUPERSEDED);
            await moveItem(type, id, from, undoRequest.for);
            undoRequest.clear();
            // A full project keeps the item unpinned.
            if (moved.pinned) await api.workspace.pinItem({ type, id }).catch(() => undefined);
          },
          undefined,
          { queued: true },
        );
      },
    });
    itemChanges.offer(key, change, () => withdrawUndo(toastId));
    return true;
  }
  return { busy: action.busy, move };
}
