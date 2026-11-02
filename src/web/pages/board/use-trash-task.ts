import { api, requestId } from '../../lib/api';
import { onceMoreIfLost } from '../../lib/lost-answer';
import type { Task } from '../../lib/types';
import type { WriteRunner } from '../../lib/use-action';
import { useToast } from '../../ui';
import type { BoardFocus, BoardLayout } from './board-keys';

/**
 * "Mover para a lixeira" from a card's ⋯, through the board's queue. Resolves to where the focus goes next,
 * the card after it, or before it, or the column's name; or null when it failed.
 */
export function useTrashTask(action: WriteRunner) {
  const toast = useToast();
  return async function trash(task: Task, layout: BoardLayout): Promise<{ next: BoardFocus | null } | null> {
    const column = layout.columns.find((each) => each.cards.includes(task.id));
    const at = column?.cards.indexOf(task.id) ?? -1;
    const neighbour = column?.cards[at + 1] ?? column?.cards[at - 1];
    const next: BoardFocus | null = neighbour
      ? { kind: 'card', id: neighbour }
      : column
        ? { kind: 'column', id: column.id }
        : null;
    const input = { requestId: requestId(), id: task.id, expectedVersion: task.version };
    const trashed = await action.run(() => onceMoreIfLost(() => api.workspace.deleteTask(input)));
    if (!trashed) return null;
    toast('Tarefa movida para a lixeira.');
    return { next };
  };
}
