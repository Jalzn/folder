import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { api, errorCode, errorMessage, queryClient, refreshWorkspace, reportSessionError } from '../../lib/api';
import type { AutosaveController } from '../../lib/autosave';
import type { CanvasSnapshot } from '../../lib/canvas-autosave';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { paths } from '../../router/paths';
import { redirectedCopyText, useCopyDestination } from '../../shell';
import { useToast } from '../../ui';
import { canvasSnapshot, type EditableCanvas } from './canvas-session';

const FINAL_ERRORS = ['VALIDATION', 'DOMAIN_RULE', 'BAD_REQUEST', 'PAYLOAD_TOO_LARGE'];

interface PendingCopy {
  snapshot: CanvasSnapshot;
  projectId: string;
  projectName: string;
  /** The drawing's own project is archived or gone: the toast says where the copy went. */
  redirected: boolean;
  archivedName: string | undefined;
  requestId: string;
}

/**
 * The drawing's actions besides drawing: taking the saved version in a conflict, saving the draft as a copy
 * (retried with the same request until it is acknowledged or refused), and moving it to the trash.
 */
export function useCanvasActions(controller: AutosaveController<CanvasSnapshot>, canvas: EditableCanvas) {
  const toast = useToast();
  const navigate = useNavigate();
  const action = useAction();
  const trashRequest = useRequest();
  const findDestination = useCopyDestination();
  const pendingCopy = useRef<PendingCopy | null>(null);
  const [copying, setCopying] = useState(false);

  async function reloadRemote() {
    try {
      const current = await api.workspace.getCanvas({ id: canvas.id });
      controller.acceptRemote(canvasSnapshot(current), current.version);
      queryClient.setQueryData(['workspace', 'canvas', canvas.id], current);
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
    const snapshot = JSON.parse(JSON.stringify(controller.getState().snapshot)) as CanvasSnapshot;
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
      const copy = await api.workspace.createCanvas({
        ...copied,
        projectId: pending.projectId,
        title: `${copied.title || 'Sem título'} — cópia`.slice(0, 300),
        requestId: pending.requestId,
      });
      pendingCopy.current = null;
      // A newer local edit made during copying must remain recoverable on the original.
      const unchanged = () => JSON.stringify(copied) === JSON.stringify(controller.getState().snapshot);
      if (unchanged()) {
        try {
          const original = await api.workspace.getCanvas({ id: canvas.id });
          if (unchanged()) controller.acceptRemote(canvasSnapshot(original), original.version);
        } catch {
          // The acknowledged copy remains safe even when the original was trashed elsewhere.
        }
      }
      await refreshWorkspace();
      toast(
        pending.redirected
          ? redirectedCopyText(pending.projectName, pending.archivedName)
          : 'Seu rascunho foi salvo em um novo desenho.',
      );
      void navigate({ href: paths.drawing(pending.projectId, copy.id) });
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
      toast('Resolva o salvamento antes de mover o desenho para a lixeira.', 'error');
      return false;
    }
    const input = { id: canvas.id, expectedVersion: controller.getState().version };
    const done = await action.run(
      () => api.workspace.deleteCanvas({ ...input, requestId: trashRequest.for(input) }),
      () => {
        trashRequest.clear();
        toast('Desenho movido para a lixeira.');
        void navigate({ href: canvas.projectId ? paths.overview(canvas.projectId) : paths.start });
      },
    );
    return done !== undefined;
  }

  return { reloadRemote, saveCopy, copying, moveToTrash, trashing: action.busy };
}
