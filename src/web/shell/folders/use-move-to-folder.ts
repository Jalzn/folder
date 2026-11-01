import { api, requestId } from '../../lib/api';
import type { ItemType } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { useToast, useWithdrawUndo } from '../../ui';
import { useAnnounce } from '../announcer';
import { useItemChanges } from '../item-changes';
import { movedText } from './folder-text';
import { moveToFolder } from './move-to-folder';

/** An item that changes folder, where it is and whether it is pinned there. */
export interface FolderMoveItem {
  type: ItemType;
  id: string;
  projectId: string;
  folderId: string | null;
  pinned: boolean;
}

/** What an undo says when a newer change of the item came first. */
export const UNDO_SUPERSEDED = 'O item mudou depois; nada foi desfeito.';

/**
 * Moving an item between the folders of its project and the root, with the toast of each move: "Movido para
 * MCP." or "Movido para a raiz do projeto.", and when the destination has no room for its pin, that it went
 * unpinned. Desfazer (⌘Z) moves it back and pins it again if it lost its pin. It undoes only its own move: a
 * newer change of the item takes the Desfazer away, and an undo already waiting does nothing. Each toast's
 * undo has its own request ID, kept for its retries.
 */
export function useMoveToFolder() {
  const action = useAction();
  const toast = useToast();
  const announce = useAnnounce();
  const withdrawUndo = useWithdrawUndo();
  const changes = useItemChanges();
  // One request per move: a retry after a lost answer replays it.
  const moving = useRequest();
  /** Resolves true once the item moved; the same place only says so. */
  async function move(item: FolderMoveItem, folder: { id: string; name: string } | null) {
    const to = folder?.id ?? null;
    if (to === item.folderId) {
      announce('O item já está aí.');
      return false;
    }
    const key = `${item.type}:${item.id}`;
    const input = { type: item.type, id: item.id, folderId: to };
    // The change begins once the write is accepted: a move refused while another write runs changes nothing,
    // and leaves the Desfazer of the item's last toast.
    let begun = 0;
    const moved = await action.run(() => {
      begun = changes.begin(key);
      return moveToFolder(item.type, item.id, item.projectId, to, moving.for(input));
    });
    if (!begun) return false;
    if (!moved) {
      changes.release(key, begun);
      return false;
    }
    moving.clear();
    const lostPin = item.pinned && moved.pinnedAt === null;
    const undoId = requestId();
    const toastId = toast(movedText(folder?.name ?? null, lostPin), {
      undo: () => {
        if (!changes.isLatest(key, begun)) return announce(UNDO_SUPERSEDED);
        const undoing = changes.begin(key);
        return action.run(
          async () => {
            try {
              // A change that came while this undo waited behind another write wins.
              if (!changes.isLatest(key, undoing)) return announce(UNDO_SUPERSEDED);
              await moveToFolder(item.type, item.id, item.projectId, item.folderId, undoId);
              if (lostPin) await api.workspace.pinItem({ type: item.type, id: item.id }).catch(() => undefined);
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
