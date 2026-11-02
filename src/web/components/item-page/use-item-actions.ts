import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { errorMessage, queryClient, refreshWorkspace, reportSessionError } from '../../lib/api';
import type { AutosaveController } from '../../lib/autosave';
import { inFolderOrRoot } from '../../lib/folder-fallback';
import type { ItemType } from '../../lib/types';
import { useRequest } from '../../lib/use-request';
import { paths } from '../../router/paths';
import { copyFolder, redirectedCopyText, useCopyDestination } from '../../shell';
import { useAction } from '../../shell/writes';
import { useToast } from '../../ui';
import { copyTitle, isFinalRefusal } from './item-copy';
import { itemWords } from './item-words';

/** What the shared actions need to know about one kind of item: its reads and writes by RPC. */
export interface ItemAdapter<Snapshot extends { title: string; projectId: string }, Item extends { version: number }> {
  type: ItemType;
  id: string;
  /** The query of the open item, which a reload of the saved version updates. */
  queryKey: readonly unknown[];
  /** The item as the server has it. */
  read: () => Promise<Item>;
  snapshot: (item: Item) => Snapshot;
  /** Creates a copy of `snapshot` with `title` in `projectId` (in `folderId`, or at its root), under `requestId`. */
  createCopy: (
    snapshot: Snapshot,
    place: { projectId: string; folderId: string | undefined },
    title: string,
    requestId: string,
  ) => Promise<{ id: string }>;
  remove: (input: { id: string; expectedVersion: number; requestId: string }) => Promise<unknown>;
}

interface PendingCopy<Snapshot> {
  snapshot: Snapshot;
  projectId: string;
  /** The item's folder when the copy stays in its project (decision 15). */
  folderId: string | undefined;
  projectName: string;
  /** The item's own project is archived or gone: the toast says where the copy went. */
  redirected: boolean;
  archivedName: string | undefined;
  requestId: string;
}

/**
 * What a document and a drawing page do besides editing, the same way for both: take the saved version in
 * a conflict, save the draft as a copy (retried with one request until it is acknowledged or refused, and
 * leaving an edit made meanwhile recoverable on the original), and move the item to the trash. A session
 * that expired on the way is reported, so the login can come back over the page.
 */
export function useItemActions<Snapshot extends { title: string; projectId: string }, Item extends { version: number }>(
  controller: AutosaveController<Snapshot>,
  item: ItemAdapter<Snapshot, Item>,
) {
  const words = itemWords[item.type];
  const toast = useToast();
  const navigate = useNavigate();
  const action = useAction();
  const trashRequest = useRequest();
  const findDestination = useCopyDestination();
  const pendingCopy = useRef<PendingCopy<Snapshot> | null>(null);
  const [copying, setCopying] = useState(false);

  async function reloadRemote() {
    try {
      const current = await item.read();
      controller.acceptRemote(item.snapshot(current), current.version);
      queryClient.setQueryData(item.queryKey, current);
      toast('Versão salva carregada.');
      return true;
    } catch (error) {
      reportSessionError(error);
      toast(errorMessage(error), 'error');
      return false;
    }
  }

  async function preparedCopy() {
    if (pendingCopy.current) return pendingCopy.current;
    const snapshot = structuredClone(controller.getState().snapshot);
    const { destination, projects } = await findDestination(snapshot.projectId);
    if (!destination) return null;
    const open = queryClient.getQueryData<{ folderId: string | null }>(item.queryKey);
    pendingCopy.current = {
      snapshot,
      projectId: destination.project.id,
      folderId: copyFolder({ projectId: snapshot.projectId, folderId: open?.folderId ?? null }, destination),
      projectName: destination.project.name,
      redirected: destination.redirected,
      archivedName: projects.find((project) => project.id === snapshot.projectId)?.name,
      requestId: crypto.randomUUID(),
    };
    return pendingCopy.current;
  }

  async function saveCopy() {
    if (copying) return;
    setCopying(true);
    try {
      const pending = await preparedCopy();
      if (!pending) {
        toast('Crie ou desarquive um projeto para salvar a cópia.', 'error');
        return;
      }
      const copied = pending.snapshot;
      const title = copyTitle(copied.title);
      // A folder deleted elsewhere sends the copy to the root, and a retry goes there too. A refused request
      // records nothing, so the root takes the same request ID.
      const { created: copy, atRoot } = await inFolderOrRoot(pending.folderId, (folderId) => {
        pending.folderId = folderId;
        return item.createCopy(copied, { projectId: pending.projectId, folderId }, title, pending.requestId);
      });
      pendingCopy.current = null;
      // A newer local edit made during copying must remain recoverable on the original.
      const unchanged = () => JSON.stringify(copied) === JSON.stringify(controller.getState().snapshot);
      if (unchanged()) {
        try {
          const original = await item.read();
          if (unchanged()) controller.acceptRemote(item.snapshot(original), original.version);
        } catch {
          // The acknowledged copy remains safe even when the original was trashed elsewhere.
        }
      }
      await refreshWorkspace();
      toast(
        pending.redirected
          ? redirectedCopyText(pending.projectName, pending.archivedName)
          : atRoot
            ? `Seu rascunho foi salvo em ${words.aNew}, na raiz do projeto: a pasta foi excluída.`
            : `Seu rascunho foi salvo em ${words.aNew}.`,
      );
      void navigate({ href: paths.item(pending.projectId, item.type, copy.id) });
    } catch (error) {
      // A final refusal, or the item gone: the next copy starts a new request.
      if (isFinalRefusal(error)) pendingCopy.current = null;
      reportSessionError(error);
      toast(errorMessage(error), 'error');
    } finally {
      setCopying(false);
    }
  }

  async function moveToTrash() {
    if (!(await controller.flush())) {
      toast(`Resolva o salvamento antes de mover ${words.the} para a lixeira.`, 'error');
      return false;
    }
    const input = { id: item.id, expectedVersion: controller.getState().version };
    let trashed = false;
    await action.run(
      () => item.remove({ ...input, requestId: trashRequest.for(input) }),
      () => {
        trashed = true;
        trashRequest.clear();
        toast(`${words.capital} movido para a lixeira.`);
        // The item's project, as the editor has it now, after any move.
        void navigate({ href: paths.overview(controller.getState().snapshot.projectId) });
      },
    );
    return trashed;
  }

  return { reloadRemote, saveCopy, copying, moveToTrash, trashing: action.busy };
}
