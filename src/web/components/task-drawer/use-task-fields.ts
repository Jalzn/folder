import { useRef } from 'react';
import { api, queryClient, requestId } from '../../lib/api';
import { followingTask } from '../../lib/board-order';
import { onceMoreIfLost } from '../../lib/lost-answer';
import { cachedTasks, keys, type TaskWithText } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { useRequest } from '../../lib/use-request';
import { useTaskDrawer } from '../../shell/task-drawer-state';
import { useAction, useUndoableChange } from '../../shell/writes';
import { useToast } from '../../ui';
import { useCreateLabel } from '../labels/use-create-label';
import { TASK_CHANGED } from '../task/task-change-text';
import { useTaskCompletion } from '../task/use-task-completion';

type FieldKind = 'column' | 'due' | 'labels';
type FieldPatch = { columnId?: string; dueOn?: string | null; labelIds?: string[] };

/**
 * The drawer's writes to the open task's fields, one at a time in a queue: its column, due date, labels,
 * project and completion, the last two with Desfazer, and the trash. Each intent keeps its own request ID, so
 * a retried write replays the first answer, and each write sends the version the previous one left. The
 * title and the description save apart, by the text's autosave (task-session.ts).
 */
export function useTaskFields(task: Task | undefined) {
  const action = useAction();
  const toast = useToast();
  const drawer = useTaskDrawer();
  const completion = useTaskCompletion(action);
  const change = useUndoableChange(action);
  const createLabel = useCreateLabel(action);
  const requests = { column: useRequest(), due: useRequest(), labels: useRequest(), trash: useRequest() };
  const latest = useRef(task);
  latest.current = task;
  // The version each write left, ahead of the list that the next render brings.
  const acked = useRef<{ id: string; version: number } | null>(null);
  const version = (current: Task) =>
    acked.current?.id === current.id ? Math.max(current.version, acked.current.version) : current.version;

  function update(kind: FieldKind, patch: FieldPatch, done?: (current: Task) => void) {
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

  /** To another project, at the end of the same column; Desfazer brings it back to its place there. */
  function setProject(projectId: string, name: string) {
    const start = latest.current;
    if (!start) return Promise.resolve(undefined);
    const [going, back, place] = [requestId(), requestId(), requestId()];
    let from: { projectId: string; columnId: string; before: string | null } | null = null;
    // The drawer goes with the task as soon as the server moved it, before the workspace reads again: in
    // between, the list of the project it left no longer has the task while the drawer still showed that
    // project, and the editor closed and opened again, losing the focus.
    const follow = (to: string) => {
      queryClient.setQueryData<TaskWithText>(keys.task(start.id), (detail) => detail && { ...detail, projectId: to });
      drawer.showTask({ id: start.id, projectId: to, title: start.title });
    };
    return change(
      `task:${start.id}`,
      () => {
        const current = latest.current ?? start;
        from = {
          projectId: current.projectId,
          columnId: current.columnId,
          before: followingTask(cachedTasks(current.projectId, current.id)?.tasks ?? [], current),
        };
        const input = { requestId: going, id: current.id, expectedVersion: version(current), projectId };
        return onceMoreIfLost(() => api.workspace.updateTask(input)).then((ack) => {
          follow(projectId);
          return ack;
        });
      },
      (ack) => {
        acked.current = { id: ack.id, version: ack.version };
        const was = from;
        return {
          text: `A tarefa foi para ${name}.`,
          changed: TASK_CHANGED,
          undo: was
            ? async () => {
                const input = { requestId: back, id: start.id, expectedVersion: ack.version, projectId: was.projectId };
                const returned = await onceMoreIfLost(() => api.workspace.updateTask(input));
                acked.current = { id: returned.id, version: returned.version };
                follow(was.projectId);
                const spot = { columnId: was.columnId, beforeTaskId: was.before };
                const moved = await onceMoreIfLost(() =>
                  api.workspace.moveTask({
                    requestId: place,
                    id: start.id,
                    expectedVersion: returned.version,
                    ...spot,
                  }),
                );
                acked.current = { id: moved.id, version: moved.version };
              }
            : undefined,
        };
      },
    );
  }

  return {
    busy: action.busy,
    /** To another column, at its end, or at the top of the done column. */
    setColumn: (columnId: string, name: string) => update('column', { columnId }, () => toast(`Movida para ${name}.`)),
    setDue: (dueOn: string | null) => update('due', { dueOn }),
    setLabels: (labelIds: string[]) => update('labels', { labelIds }),
    /** Creates a label with the next color and puts it on the task. */
    addNewLabel: async (name: string) => {
      const created = await createLabel(name);
      const current = latest.current;
      if (created && current) await update('labels', { labelIds: [...current.labelIds, created] });
    },
    setProject,
    /** Concluir, or Reabrir in the first open column, with Desfazer. */
    toggleDone: () => {
      const current = latest.current;
      return current ? completion(current.id, current.projectId) : Promise.resolve(undefined);
    },
    trash: () => {
      const start = latest.current;
      if (!start) return Promise.resolve(undefined);
      return action.run(
        () => {
          const current = latest.current ?? start;
          const input = { id: current.id, expectedVersion: version(current) };
          // A lost answer goes once more with the same request, which the server replays, as the card's
          // trash does (decision 7).
          return onceMoreIfLost(() => api.workspace.deleteTask({ ...input, requestId: requests.trash.for(input) }));
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
