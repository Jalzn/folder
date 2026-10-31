import { useEffect, useRef, useState } from 'react';
import { api, errorMessage, refreshWorkspace, reportSessionError } from '../../lib/api';
import type { Task, TaskStatus } from '../../lib/types';
import { useRequest } from '../../lib/use-request';
import { useToast } from '../../ui';

/** Where a task created from a document's selection came from. */
export interface TaskOrigin {
  documentId: string;
  blockId?: string | null;
  excerpt: string;
  expectedVersion?: number;
}

export interface TaskFormInput {
  open: boolean;
  onClose: () => void;
  task?: Task | undefined;
  initialProjectId?: string | null | undefined;
  initialStatus?: TaskStatus | undefined;
  source?: TaskOrigin | undefined;
  initialTitle?: string | undefined;
}

/**
 * The task dialog's fields and writes. Each opening starts from the task, or from the initial values of a
 * new one; a retried save reuses its request, so a lost answer never creates the task twice.
 */
export function useTaskForm({
  open,
  onClose,
  task,
  initialProjectId = null,
  initialStatus = 'todo',
  source,
  initialTitle = '',
}: TaskFormInput) {
  const [title, setTitle] = useState(task?.title ?? initialTitle);
  const [projectId, setProjectId] = useState<string | null>(task?.projectId ?? initialProjectId);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const request = useRequest();
  const toast = useToast();
  const opening = useRef(false);
  useEffect(() => {
    if (open && !opening.current) {
      setTitle(task?.title ?? initialTitle);
      setProjectId(task?.projectId ?? initialProjectId);
      setStatus(task?.status ?? initialStatus);
      setError(null);
      setConfirmDelete(false);
      request.clear();
    }
    opening.current = open;
  }, [open, task, initialTitle, initialProjectId, initialStatus, request]);

  async function write(work: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    try {
      await work();
      request.clear();
      await refreshWorkspace();
      toast(done);
      onClose();
    } catch (e) {
      reportSessionError(e);
      setError(errorMessage(e));
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!title.trim() || busy) return;
    if (task) {
      // An existing task always has a project, so the field is never empty here.
      const input = {
        id: task.id,
        expectedVersion: task.version,
        title: title.trim(),
        ...(projectId ? { projectId } : {}),
        status,
      };
      await write(() => api.workspace.updateTask({ ...input, requestId: request.for(input) }), 'Tarefa atualizada.');
    } else {
      const input = { title: title.trim(), projectId, status, ...(source ? { source } : {}) };
      await write(
        () => api.workspace.createTask({ ...input, requestId: request.for(input) }),
        'Tarefa criada. Um próximo passo definido.',
      );
    }
  }

  async function remove() {
    if (!task || busy) return;
    const input = { id: task.id, expectedVersion: task.version };
    await write(() => api.workspace.deleteTask({ ...input, requestId: request.for(input) }), 'Tarefa excluída.');
  }

  // Changed from what the dialog opened with: closing without saving then asks first.
  const dirty =
    title !== (task?.title ?? initialTitle) ||
    status !== (task?.status ?? initialStatus) ||
    projectId !== (task?.projectId ?? initialProjectId);

  return {
    dirty,
    title,
    setTitle,
    projectId,
    setProjectId,
    status,
    setStatus,
    busy,
    error,
    confirmDelete,
    setConfirmDelete,
    submit,
    remove,
  };
}
