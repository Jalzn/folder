import { assertVersion } from '@tinyfold/core/application';
import type { IsoInstant } from '@tinyfold/core/domain';
import { FOLDER_LIMITS } from '../../domain/folders.js';
import { MAX_PINNED } from '../../domain/project.js';
import type { FolderItem, FolderLifecyclePorts, WorkspaceFlowContext } from '../ports/context.js';
import type { DeleteFolderInput } from '../schemas/folders.js';
import { renumberFolders, requireActiveFolder, requireProjectForFolders } from './folder-rules.js';

type DeleteFolderPorts = Pick<
  FolderLifecyclePorts,
  | 'findFolder'
  | 'findProject'
  | 'itemsInFolder'
  | 'pinnedInScope'
  | 'trashItem'
  | 'placeItem'
  | 'saveFolder'
  | 'activeFolders'
  | 'setFolderPosition'
>;

/** An item a deletion took out of the folder, with the pin it had in the folder, for the undo. */
interface ListedItem {
  type: FolderItem['type'];
  id: string;
  pinnedAt: IsoInstant | null;
}

/**
 * An item a deletion moved to the root. `keptPin` says it is still pinned there; otherwise it had no
 * pin, or lost it to a full root, and only then may the undo give `pinnedAt` back.
 */
export interface MovedToRoot extends ListedItem {
  keptPin: boolean;
}

/** An item a deletion sent to the trash, at its new version; the trash took its pin. */
export interface MovedToTrash extends ListedItem {
  version: number;
}

/**
 * Deletes a folder. Its live documents and drawings go to the root, or, with `withItems`, to the
 * trash, in the same transaction. The answer is what restoreFolder takes back to undo it: at most
 * FOLDER_LIMITS.restoredItems items, with `complete` false when there were more.
 *
 * - To the root, an item is not edited (version and dates stay) and keeps its pin while the root has
 *   room, in pin order (`keptPin`); `unpinned` counts the others.
 * - To the trash, an item gets the folder's instant, a new version and no pin, and keeps the folder
 *   as its origin.
 *
 * The folder keeps its row and its last position, and the other folders are numbered again.
 */
export function deleteFolder(ctx: WorkspaceFlowContext<DeleteFolderPorts>, input: DeleteFolderInput) {
  return ctx.write('workspace.deleteFolder', input, async (repo) => {
    const folder = await requireActiveFolder(repo, input.id);
    assertVersion(folder.version, input.expectedVersion);
    await requireProjectForFolders(repo, folder.projectId);
    const now = ctx.now();
    const items = await repo.itemsInFolder(folder.id);
    const moved: MovedToRoot[] = [];
    const trashed: MovedToTrash[] = [];
    let unpinned = 0;
    if (input.withItems)
      for (const item of items) {
        await repo.trashItem({ type: item.type, id: item.id, at: now, expectedVersion: item.version });
        trashed.push({ type: item.type, id: item.id, version: item.version + 1, pinnedAt: item.pinnedAt });
      }
    else {
      let rootPins = await repo.pinnedInScope({ projectId: folder.projectId, folderId: null });
      for (const item of items) {
        const keepsPin = item.pinnedAt !== null && rootPins < MAX_PINNED;
        if (keepsPin) rootPins += 1;
        else if (item.pinnedAt !== null) unpinned += 1;
        await repo.placeItem({
          type: item.type,
          id: item.id,
          folderId: null,
          pinnedAt: keepsPin ? item.pinnedAt : null,
        });
        moved.push({ type: item.type, id: item.id, pinnedAt: item.pinnedAt, keptPin: keepsPin });
      }
    }
    const version = folder.version + 1;
    await repo.saveFolder({ ...folder, version, updatedAt: now, deletedAt: now }, folder.version);
    await renumberFolders(repo, await repo.activeFolders(folder.projectId));
    const limit = FOLDER_LIMITS.restoredItems;
    return {
      id: folder.id,
      version,
      moved: moved.slice(0, limit),
      trashed: trashed.slice(0, limit),
      unpinned,
      complete: items.length <= limit,
    };
  });
}
