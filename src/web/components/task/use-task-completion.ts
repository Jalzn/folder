import { api, requestId } from '../../lib/api';
import { doneAndFirstOpen, followingTask } from '../../lib/board-order';
import { Refusal } from '../../lib/errors';
import { onceMoreIfLost } from '../../lib/lost-answer';
import { cachedColumns, cachedTasks } from '../../lib/queries';
import { displayTitle } from '../../lib/types';
import { useUndoableChange, type WriteRunner } from '../../shell/writes';
import { completedText, reopenedText, TASK_CHANGED } from './task-change-text';

/**
 * Concluir and Reabrir, from a card, its menu, ⌘↵ or the drawer (docs/etapas/10-quadro-tarefa.md, decisions 13
 * and 14): completing puts the task at the top of the done column, reopening at the end of the first open
 * column. Desfazer puts it back in its column, before the task that followed it. The write reads the board as
 * it is when the queue runs it.
 */
export function useTaskCompletion(action: WriteRunner) {
  const change = useUndoableChange(action);
  /** `undone` runs after a Desfazer, once the board read again. */
  return function toggleDone(id: string, projectId: string, undone?: () => void) {
    const intent = requestId();
    const undoIntent = requestId();
    let from: { columnId: string; before: string | null } | null = null;
    let text = '';
    return change(
      `task:${id}`,
      () => {
        const tasks = cachedTasks(projectId, id)?.tasks ?? [];
        const task = tasks.find((each) => each.id === id);
        const { done, open } = doneAndFirstOpen(cachedColumns() ?? []);
        if (!task || !done || !open) throw new Refusal('Esta tarefa não está mais neste quadro.');
        const reopening = task.columnId === done.id;
        const to = reopening ? open : done;
        from = { columnId: task.columnId, before: followingTask(tasks, task) };
        text = reopening ? reopenedText(open.name) : completedText(displayTitle(task.title));
        const input = { requestId: intent, id, expectedVersion: task.version, columnId: to.id };
        return onceMoreIfLost(() => api.workspace.updateTask(input));
      },
      (ack) => {
        const back = from;
        return {
          text,
          changed: TASK_CHANGED,
          undone,
          undo: back
            ? () =>
                onceMoreIfLost(() =>
                  api.workspace.moveTask({
                    requestId: undoIntent,
                    id,
                    expectedVersion: ack.version,
                    columnId: back.columnId,
                    beforeTaskId: back.before,
                  }),
                )
            : undefined,
        };
      },
    );
  };
}
