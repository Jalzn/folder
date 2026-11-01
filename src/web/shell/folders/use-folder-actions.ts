import { useNavigate } from '@tanstack/react-router';
import type { NavFolder, NavItem } from '@tinyfold/workspace/domain';
import { api, requestId } from '../../lib/api';
import { useAction } from '../../lib/use-action';
import { paths } from '../../router/paths';
import { useToast } from '../../ui';
import { useShellUi } from '../shell-ui';
import { deletedText, positionText, restoredText, trashedText } from './folder-text';

/** Folder writes of the sidebar (docs/etapas/09-pastas.md, "Ações de pasta"), with their toasts and undo. */
export function useFolderActions(projectId: string) {
  const action = useAction();
  const toast = useToast();
  const ui = useShellUi();
  const navigate = useNavigate();

  /** Creates a folder at the top; resolves to it, or undefined when the server refused. */
  async function create(name: string) {
    const created = await action.run(() => api.workspace.createFolder({ projectId, name, requestId: requestId() }));
    return created ? { id: created.id, name } : undefined;
  }

  async function rename(folder: NavFolder, name: string) {
    const renamed = await action.run(() =>
      api.workspace.renameFolder({ id: folder.id, expectedVersion: folder.version, name, requestId: requestId() }),
    );
    if (renamed) ui.announce(`Pasta renomeada: ${name}`);
    return Boolean(renamed);
  }

  /** One place up or down among the folders, announced: "Pasta MCP na posição 2 de 4". */
  async function move(folder: NavFolder, folders: readonly NavFolder[], direction: 'up' | 'down') {
    const at = folders.findIndex((each) => each.id === folder.id);
    const to = direction === 'up' ? at - 1 : at + 1;
    if (at < 0 || to < 0 || to >= folders.length) return false;
    // Before the folder now at `to` going up; before the one after it going down, or last.
    const before = direction === 'up' ? (folders[to]?.id ?? null) : (folders[to + 1]?.id ?? null);
    const moved = await action.run(() =>
      api.workspace.moveFolder({ id: folder.id, beforeFolderId: before, requestId: requestId() }),
    );
    if (!moved) return false;
    ui.announce(positionText(folder.name, to, folders.length));
    return true;
  }

  /**
   * Deletes a folder: its items go to the root, or with `withItems` to the trash. The toast offers Desfazer,
   * which sends back exactly what the deletion did, unless the folder held more than the server lists. An
   * open item that went to the trash leaves its page for the Visão geral.
   */
  async function remove(folder: NavFolder, withItems: boolean, open: NavItem | null, onRestored?: () => void) {
    const deleted = await action.run(() =>
      api.workspace.deleteFolder({ id: folder.id, expectedVersion: folder.version, withItems, requestId: requestId() }),
    );
    if (!deleted) return false;
    const undo = deleted.complete
      ? () =>
          action.run(
            () =>
              api.workspace.restoreFolder({
                id: folder.id,
                expectedVersion: deleted.version,
                moved: deleted.moved,
                trashed: deleted.trashed,
                requestId: requestId(),
              }),
            (restored) => {
              toast(restoredText(folder.name, restored.skipped));
              onRestored?.();
            },
          )
      : undefined;
    const text = withItems
      ? trashedText(folder.name, deleted.trashed.length)
      : deletedText(folder.name, deleted.moved.length, deleted.unpinned);
    toast(text, undo ? { undo } : {});
    if (withItems && open?.folderId === folder.id) void navigate({ href: paths.overview(projectId), replace: true });
    return true;
  }

  return { busy: action.busy, create, rename, move, remove };
}
