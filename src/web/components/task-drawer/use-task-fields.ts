import { useRef } from 'react';
import { api } from '../../lib/api';
import type { Task } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { useTaskDrawer } from '../../shell/task-drawer-state';
import { useToast } from '../../ui';
import { useTaskCompletion } from '../task/use-task-completion';

/**
 * The drawer's writes to the open task, one at a time in a queue: its title, column, project, completion with
 * its Desfazer, and the trash. Each intent keeps its own request ID, so a retried write replays the first answer, and each
 * write sends the version the previous one left.
 */
export function useTaskFields(task: Task | undefined) {
  const action = useAction();
  const toast = useToast();
  const drawer = useTaskDrawer();
  const completion = useTaskCompletion(action);
  const requests = { title: useRequest(), column: useRequest(), project: useRequest(), trash: useRequest() };
  const latest = useRef(task);
  latest.current = task;
  // The version each write left, ahead of the list that the next render brings.
  const acked = useRef<{ id: string; version: number } | null>(null);
  const version = (current: Task) =>
    acked.current?.id === current.id ? Math.max(current.version, acked.current.version) : current.version;

  function update(
    kind: 'title' | 'column' | 'project',
    patch: { title?: string; columnId?: string; projectId?: string },
    done?: (current: Task) => void,
  ) {
    const start = latest.current;
    if (!start) return Promise.resolve(undefined);
    const request = requests[kind];
    return action.run(
      () => {
        const current = latest.current ?? start;
        const input = { id: current.id, expectedVersion: version(current), ...patch };
        return api.workspace.updateTask({ ...input, requestId: request.for(input) });
      },
      (ack) => {
        request.clear();
        acked.current = { id: ack.id, version: ack.version };
        done?.(latest.current ?? start);
      },
      { queued: true },
    );
  }

  return {
    busy: action.busy,
    rename: (title: string) => update('title', { title }),
    /** To another column, at its end, or at the top of the done column. */
    setColumn: (columnId: string, name: string) => update('column', { columnId }, () => toast(`Movida para ${name}.`)),
    /** Concluir, or Reabrir in the first open column, with Desfazer. */
    toggleDone: () => {
      const current = latest.current;
      return current ? completion(current.id, current.projectId) : Promise.resolve(undefined);
    },
    setProject: (projectId: string, name: string) =>
      update('project', { projectId }, (current) => {
        drawer.showTask({ id: current.id, projectId, title: current.title });
        toast(`A tarefa foi para ${name}.`);
      }),
    trash: () => {
      const start = latest.current;
      if (!start) return Promise.resolve(undefined);
      return action.run(
        () => {
          const current = latest.current ?? start;
          const input = { id: current.id, expectedVersion: version(current) };
          return api.workspace.deleteTask({ ...input, requestId: requests.trash.for(input) });
        },
        () => {
          requests.trash.clear();
          drawer.close({ force: true });
          toast('Tarefa movida para a lixeira.');
        },
        { queued: true },
      );
    },
  };
}
