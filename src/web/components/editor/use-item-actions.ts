import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { errorCode, errorMessage, queryClient, refreshWorkspace, reportSessionError } from '../../lib/api';
import type { AutosaveController } from '../../lib/autosave';
import { displayTitle } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { paths } from '../../router/paths';
import { redirectedCopyText, useCopyDestination } from '../../shell';
import { useToast } from '../../ui';

/** Refusals that a retry with the same request would only repeat: the next copy starts a new request. */
const FINAL_ERRORS = ['VALIDATION', 'DOMAIN_RULE', 'BAD_REQUEST', 'PAYLOAD_TOO_LARGE'];

/** What the shared actions need to know about one kind of item. */
export interface ItemAdapter<Snapshot extends { title: string; projectId: string }, Item> {
  id: string;
  /** The item's project, where the page goes after the item leaves for the trash. */
  projectId: string;
  /** The query of the open item, which a reload of the saved version updates. */
  queryKey: readonly unknown[];
  /** The item as the server has it. */
  read: () => Promise<Item>;
  snapshot: (item: Item) => Snapshot;
  version: (item: Item) => number;
  /** Creates a copy of `snapshot` with `title` in `projectId`, under `requestId`. */
  createCopy: (snapshot: Snapshot, projectId: string, title: string, requestId: string) => Promise<{ id: string }>;
  remove: (input: { id: string; expectedVersion: number; requestId: string }) => Promise<unknown>;
  path: (projectId: string, id: string) => string;
  /** The words of this kind of item: "o documento", "um novo documento", "Documento". */
  words: { the: string; aNew: string; capital: string };
}

interface PendingCopy<Snapshot> {
  snapshot: Snapshot;
  projectId: string;
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
export function useItemActions<Snapshot extends { title: string; projectId: string }, Item>(
  controller: AutosaveController<Snapshot>,
  item: ItemAdapter<Snapshot, Item>,
) {
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
      controller.acceptRemote(item.snapshot(current), item.version(current));
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
    pendingCopy.current = {
      snapshot,
      projectId: destination.project.id,
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
      const title = `${displayTitle(copied.title)} — cópia`.slice(0, 300);
      const copy = await item.createCopy(copied, pending.projectId, title, pending.requestId);
      pendingCopy.current = null;
      // A newer local edit made during copying must remain recoverable on the original.
      const unchanged = () => JSON.stringify(copied) === JSON.stringify(controller.getState().snapshot);
      if (unchanged()) {
        try {
          const original = await item.read();
          if (unchanged()) controller.acceptRemote(item.snapshot(original), item.version(original));
        } catch {
          // The acknowledged copy remains safe even when the original was trashed elsewhere.
        }
      }
      await refreshWorkspace();
      toast(
        pending.redirected
          ? redirectedCopyText(pending.projectName, pending.archivedName)
          : `Seu rascunho foi salvo em ${item.words.aNew}.`,
      );
      void navigate({ href: item.path(pending.projectId, copy.id) });
    } catch (error) {
      if (FINAL_ERRORS.includes(errorCode(error) ?? '')) pendingCopy.current = null;
      reportSessionError(error);
      toast(errorMessage(error), 'error');
    } finally {
      setCopying(false);
    }
  }

  async function moveToTrash() {
    if (!(await controller.flush())) {
      toast(`Resolva o salvamento antes de mover ${item.words.the} para a lixeira.`, 'error');
      return false;
    }
    const input = { id: item.id, expectedVersion: controller.getState().version };
    let trashed = false;
    await action.run(
      () => item.remove({ ...input, requestId: trashRequest.for(input) }),
      () => {
        trashed = true;
        trashRequest.clear();
        toast(`${item.words.capital} movido para a lixeira.`);
        void navigate({ href: paths.overview(item.projectId) });
      },
    );
    return trashed;
  }

  return { reloadRemote, saveCopy, copying, moveToTrash, trashing: action.busy };
}
