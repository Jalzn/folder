import { useNavigate } from '@tanstack/react-router';
import type { NavFolder, NavItem } from '@tinyfold/workspace/domain';
import { api } from '../../lib/api';
import { onceMoreIfLost } from '../../lib/writes/lost-answer';
import { useRequest } from '../../lib/writes/use-request';
import { paths } from '../../navigation/paths';
import { useToast } from '../../ui';
import { useAnnounce } from '../announcer';
import { useAction } from '../writes';
import { deletedText, edgeText, positionText, restoredText, trashedText } from './folder-text';

/** What an undo of a folder's deletion says when it fails, whatever the server said. */
const RESTORE_FAILED = 'Não foi possível desfazer a exclusão da pasta.';

/**
 * Folder writes of the sidebar (docs/etapas/09-pastas.md, "Ações de pasta"), with their toasts and undo. Each
 * user intent keeps one request ID until it succeeds, and a write whose answer was lost is sent once more
 * with it before the tree reads again, so the server replays it, the deletion's lists included; an undo
 * waits for a write in progress instead of being dropped.
 */
export function useFolderActions(projectId: string) {
  const action = useAction();
  const creating = useRequest();
  const renaming = useRequest();
  const placing = useRequest();
  const deleting = useRequest();
  const restoring = useRequest();
  const toast = useToast();
  const announce = useAnnounce();
  const navigate = useNavigate();

  /** Creates a folder at the top; resolves to it, or undefined when the server refused. */
  async function create(name: string) {
    const input = { projectId, name };
    const created = await action.run(() =>
      onceMoreIfLost(() => api.workspace.createFolder({ ...input, requestId: creating.for(input) })),
    );
    if (!created) return undefined;
    creating.clear();
    return { id: created.id, name };
  }

  async function rename(folder: NavFolder, name: string) {
    const input = { id: folder.id, expectedVersion: folder.version, name };
    const renamed = await action.run(() =>
      onceMoreIfLost(() => api.workspace.renameFolder({ ...input, requestId: renaming.for(input) })),
    );
    if (!renamed) return false;
    renaming.clear();
    announce(`Pasta renomeada: ${name}`);
    return true;
  }

  /** Puts a folder before another, or last with null, announced: "Pasta MCP na posição 2 de 4". */
  async function place(folder: NavFolder, beforeFolderId: string | null) {
    const input = { id: folder.id, beforeFolderId };
    const moved = await action.run(() =>
      onceMoreIfLost(() => api.workspace.moveFolder({ ...input, requestId: placing.for(input) })),
    );
    if (!moved) return false;
    placing.clear();
    const at = moved.folders.findIndex((each) => each.id === folder.id);
    announce(positionText(folder.name, at, moved.folders.length));
    return true;
  }

  /** One place up or down among the folders. */
  async function move(folder: NavFolder, folders: readonly NavFolder[], direction: 'up' | 'down') {
    const at = folders.findIndex((each) => each.id === folder.id);
    const to = direction === 'up' ? at - 1 : at + 1;
    if (at < 0) return false;
    if (to < 0 || to >= folders.length) {
      announce(edgeText(folder.name, direction));
      return false;
    }
    // Before the folder now at `to` going up; before the one after it going down, or last.
    return place(folder, direction === 'up' ? (folders[to]?.id ?? null) : (folders[to + 1]?.id ?? null));
  }

  /**
   * Deletes a folder: its items go to the root, or with `withItems` to the trash. The toast offers Desfazer,
   * which sends back exactly what the deletion did, unless the folder held more than the server lists. An
   * open item that went to the trash leaves its page for the Visão geral.
   */
  async function remove(folder: NavFolder, withItems: boolean, open: NavItem | null, onRestored?: () => void) {
    const input = { id: folder.id, expectedVersion: folder.version, withItems };
    const deleted = await action.run(() =>
      onceMoreIfLost(() => api.workspace.deleteFolder({ ...input, requestId: deleting.for(input) })),
    );
    if (!deleted) return false;
    deleting.clear();
    // The lists go back exactly as the deletion answered them.
    const restore = { id: folder.id, expectedVersion: deleted.version, moved: deleted.moved, trashed: deleted.trashed };
    const undo = deleted.complete
      ? () =>
          action.run(
            () => onceMoreIfLost(() => api.workspace.restoreFolder({ ...restore, requestId: restoring.for(restore) })),
            (restored) => {
              restoring.clear();
              toast(restoredText(folder.name, restored.skipped));
              onRestored?.();
            },
            { queued: true, failure: RESTORE_FAILED },
          )
      : undefined;
    const text = withItems
      ? trashedText(folder.name, deleted.trashed.length)
      : deletedText(folder.name, deleted.moved.length, deleted.unpinned);
    toast(text, undo ? { undo } : {});
    if (withItems && open?.folderId === folder.id) void navigate({ href: paths.overview(projectId), replace: true });
    return true;
  }

  return { busy: action.busy, create, rename, place, move, remove };
}
