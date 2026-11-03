import { useRef, useState } from 'react';
import { api, errorMessage, queryClient, refreshWorkspace } from '../../lib/api';
import { taskQuery } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { onceMoreIfLost } from '../../lib/writes/lost-answer';
import { useTaskDrawer } from '../../shell/state';
import { useToast } from '../../ui';
import { copyTitle, DRAFT_DOWNLOADED, downloadDraft, isFinalRefusal } from '../item-page';
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
      if (isFinalRefusal(error)) pending.current = null;
      toast(errorMessage(error), 'error');
    } finally {
      setCopying(false);
    }
  }

  /** A draft that could not open, as a file: the person keeps what they wrote. */
  function downloadRecovery() {
    const data = controller.getState().recoveryData ?? JSON.stringify(controller.getState().snapshot);
    downloadDraft(data, 'task', task.id);
    controller.recoveryDownloaded();
    toast(DRAFT_DOWNLOADED);
  }

  return { copying, reloadRemote, saveCopy, downloadRecovery };
}
