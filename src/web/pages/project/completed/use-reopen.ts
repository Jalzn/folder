import { type RefObject, useState } from 'react';
import { useTaskCompletion } from '../../../components/task/use-task-completion';
import { useColumns, useTasks } from '../../../lib/queries';
import { useAction } from '../../../lib/use-action';
import { pageTitle, returnFocus, whenPresent } from '../../../ui';

/**
 * The rows' titles by task ID, for the focus: by reference, never by a CSS selector. `ref(id)` is a React 19
 * callback ref, and the cleanup of an element that left keeps the newer one of the same ID.
 */
export function useTitleRefs() {
  const [elements] = useState(() => new Map<string, HTMLElement>());
  return {
    get: (id: string) => {
      const element = elements.get(id);
      return element?.isConnected ? element : undefined;
    },
    ref: (id: string) => (element: HTMLElement | null) => {
      if (element) elements.set(id, element);
      return () => {
        if (element && elements.get(id) === element) elements.delete(id);
      };
    },
  };
}

export type TitleRefs = ReturnType<typeof useTitleRefs>;

/** Nothing has the focus, or the page's title has it, or something in `container`. */
function focusIsFree(container: HTMLElement | null) {
  const active = document.activeElement;
  if (!active || active === document.body || !active.isConnected || active === pageTitle()) return true;
  return Boolean(container?.contains(active));
}

/**
 * Reabrir on Concluídas (docs/etapas/10-quadro-tarefa.md): the task goes to the end of the first open column,
 * and its toast offers Desfazer. The row leaves the list, so the focus goes to the title of the row that takes
 * its place (`nextId`), or to the page's title. After a Desfazer the task is back, and the focus follows it
 * when it was on the list or nowhere. Keeps the project's whole list of tasks and the columns read, which the
 * write reads: the board has only the last 14 days of the done column.
 */
export function useReopen(projectId: string, titles: TitleRefs, list: RefObject<HTMLElement | null>) {
  const action = useAction();
  const toggleDone = useTaskCompletion(action);
  useTasks({ projectId });
  useColumns();

  const followBack = (id: string) => {
    whenPresent(
      () => titles.get(id),
      (title) => {
        if (focusIsFree(list.current)) title.focus();
      },
    );
  };

  return (taskId: string, nextId: string | null) =>
    void toggleDone(taskId, projectId, () => followBack(taskId)).then((done) => {
      if (done) returnFocus((nextId && titles.get(nextId)) || null);
    });
}
