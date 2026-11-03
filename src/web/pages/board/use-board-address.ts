import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import type { Task } from '../../lib/types';
import { useTaskDrawer } from '../../shell/state';
import { useToast } from '../../ui';
export function useBoardAddress(projectId: string, list: readonly Task[] | undefined) {
  const { tarefa } = useSearch({ from: '/projetos/$projectId/quadro' });
  const navigate = useNavigate({ from: '/projetos/$projectId/quadro' });
  const drawer = useTaskDrawer();
  const toast = useToast();
  const { openTask } = drawer;
  const opened = useRef<string | null>(null);
  // Once the address drops ?tarefa=, the same task can be asked for again, as from ⌘K.
  useEffect(() => {
    if (!tarefa) opened.current = null;
  }, [tarefa]);
  useEffect(() => {
    // Once per address: the drawer's own state changes must not open it again.
    if (!tarefa || !list || opened.current === tarefa) return;
    opened.current = tarefa;
    void navigate({ search: {}, replace: true });
    const task = list.find((item) => item.id === tarefa);
    if (task) return openTask(task);
    // A task completed before the board's 14 days still opens.
    void api.workspace
      .getTask({ id: tarefa })
      .then((found) => {
        if (found.deletedAt || found.projectId !== projectId) throw new Error('gone');
        openTask(found);
      })
      .catch(() => toast('Esta tarefa não está mais neste quadro.', 'error'));
  }, [tarefa, list, openTask, toast, navigate, projectId]);
}
