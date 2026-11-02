import { useRef, useState } from 'react';
import { api, errorMessage, queryClient, refreshWorkspace, reportSessionError } from '../../lib/api';
import { onceMoreIfLost } from '../../lib/lost-answer';
import { taskQuery } from '../../lib/queries';
import { displayTitle, type Task } from '../../lib/types';
import { useTaskDrawer } from '../../shell/task-drawer-state';
import { useToast } from '../../ui';
import { copyTitle, isFinalRefusal } from '../item-page/item-copy';
import type { TaskTextController } from './task-session';
import { taskTextSnapshot } from './task-session';
import type { TaskTextSnapshot } from './task-text-draft';

/**
 * A text conflict's ways out (docs/etapas/10-quadro-tarefa.md, "Conflito"): take the saved version, or save
 * this device's text as a new task in the same project and column, with "<título> — cópia", the due date and
 * the labels, and open the copy. The copy keeps one request until it is acknowledged or refused.
 */
export function useTaskTextActions(controller: TaskTextController, task: Task) {
  const toast = useToast();
  const drawer = useTaskDrawer();
  const pending = useRef<{ requestId: string; text: TaskTextSnapshot } | null>(null);
  const [copying, setCopying] = useState(false);

  async function takeSaved() {
    const current = await api.workspace.getTask({ id: task.id });
    controller.acceptRemote(taskTextSnapshot(current), current.textVersion);
    queryClient.setQueryData(taskQuery(task.id).queryKey, current);
  }

  async function reloadRemote() {
    try {
      await takeSaved();
      toast('Versão salva carregada.');
      return true;
    } catch (error) {
      reportSessionError(error);
      toast(errorMessage(error), 'error');
      return false;
    }
  }

  async function saveCopy() {
    if (copying) return;
    setCopying(true);
    try {
      pending.current ??= { requestId: crypto.randomUUID(), text: structuredClone(controller.getState().snapshot) };
      const { requestId, text } = pending.current;
      const title = copyTitle(text.title);
      const input = {
        requestId,
        title,
        projectId: task.projectId,
        columnId: task.columnId,
        dueOn: task.dueOn,
        labelIds: task.labelIds,
        description: text.description,
      };
      const copy = await onceMoreIfLost(() => api.workspace.createTask(input));
      pending.current = null;
      // The original takes its saved version; the local text lives on in the copy.
      await takeSaved().catch(() => undefined);
      await refreshWorkspace();
      drawer.showTask({ id: copy.id, projectId: copy.projectId, title });
      toast(`Cópia criada: ${title}.`);
    } catch (error) {
      reportSessionError(error);
      if (isFinalRefusal(error)) pending.current = null;
      toast(errorMessage(error), 'error');
    } finally {
      setCopying(false);
    }
  }

  /** A draft that could not open, as a file: the person keeps what they wrote. */
  function downloadRecovery() {
    const data = controller.getState().recoveryData ?? JSON.stringify(controller.getState().snapshot);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    link.download = `${displayTitle(task.title)} — rascunho.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    controller.recoveryDownloaded();
  }

  return { copying, reloadRemote, saveCopy, downloadRecovery };
}
