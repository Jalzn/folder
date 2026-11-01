import { api } from '../../lib/api';
import type { ItemType } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { useToast } from '../../ui';
import { useAnnounce } from '../announcer';
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

/**
 * Moving an item between the folders of its project and the root, with the toast of each move: "Movido para
 * MCP." or "Movido para a raiz do projeto.", and when the destination has no room for its pin, that it went
 * unpinned. Desfazer (⌘Z) moves it back and pins it again if it lost its pin.
 */
export function useMoveToFolder() {
  const action = useAction();
  const toast = useToast();
  const announce = useAnnounce();
  // One request per move and per undo: a retry after a lost answer replays it.
  const moving = useRequest();
  const undoing = useRequest();
  /** Resolves true once the item moved; the same place only says so. */
  async function move(item: FolderMoveItem, folder: { id: string; name: string } | null) {
    const to = folder?.id ?? null;
    if (to === item.folderId) {
      announce('O item já está aí.');
      return false;
    }
    const input = { type: item.type, id: item.id, folderId: to };
    const moved = await action.run(() => moveToFolder(item.type, item.id, item.projectId, to, moving.for(input)));
    if (!moved) return false;
    moving.clear();
    const lostPin = item.pinned && moved.pinnedAt === null;
    toast(movedText(folder?.name ?? null, lostPin), {
      undo: () =>
        action.run(
          async () => {
            const back = { type: item.type, id: item.id, folderId: item.folderId };
            await moveToFolder(item.type, item.id, item.projectId, item.folderId, undoing.for(back));
            undoing.clear();
            if (lostPin) await api.workspace.pinItem({ type: item.type, id: item.id }).catch(() => undefined);
          },
          undefined,
          { queued: true },
        ),
    });
    return true;
  }
  return { busy: action.busy, move };
}
