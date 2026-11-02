import { useRef } from 'react';
import { completedText, TASK_CHANGED } from '../../components/task/task-change-text';
import { api, errorCode, requestId } from '../../lib/api';
import { followingTask } from '../../lib/board-order';
import { onceMoreIfLost } from '../../lib/lost-answer';
import { usesCommandKey } from '../../lib/platform';
import { cachedColumns, cachedTasks } from '../../lib/queries';
import { displayTitle, type Task } from '../../lib/types';
import type { WriteRunner } from '../../lib/use-action';
import { useAnnounce } from '../../shell/announcer';
import { useUndoableChange } from '../../shell/use-undoable-change';
import { arrangeBoard, type BoardColumnView, keyLayout, placeOf } from './board-columns';
import { AT_END, AT_TOP, beforeCardAt, boardKey, type KeyPress } from './board-keys';
import { BOARD_CHANGED, movedText, positionText } from './board-text';

/** Where a card goes: a column, before a card of it or at its end. */
export interface CardSpot {
  columnId: string;
  beforeTaskId: string | null;
}

/** How long after a move an edge's words join it: a burst of ⇧ and arrows. */
const BURST_MS = 1500;

/** Where a task completed by a move came from, for its Desfazer. */
interface Completion {
  title: string;
  from: string;
  before: string | null;
  version: number;
}

type Outcome =
  | { kind: 'none' }
  | { kind: 'say'; text: string }
  | { kind: 'conflict' }
  | { kind: 'moved'; within: boolean; completed: Completion | null };

/** The board as last read, as it shows: the project's columns with their visible tasks, and its revision. */
function readBoard(projectId: string, visible: (task: Task) => boolean) {
  const list = cachedTasks(projectId);
  const columns = cachedColumns();
  if (!list || !columns) return null;
  return { view: arrangeBoard(columns, list.tasks.filter(visible)), tasks: list.tasks, revision: list.revision };
}

/**
 * The board's moves of a card (docs/etapas/10-quadro-tarefa.md, "Teclado do quadro" and "Arrastar"): with ⇧ and
 * the arrows, to the top or the end of its column, to a column from its menu, and by dropping it. They go
 * through the board's write queue one after another, and each one works out its place when it runs, from the
 * board as last read, so a second ⇧↓ pressed during the first moves from where the first left the card. A move
 * sends that board's revision: when another device changed the board, the server refuses it, the board reads
 * again and the live region says so. Each move is announced; `moved` runs after one, for the focus.
 */
export function useBoardMoves(
  projectId: string,
  action: WriteRunner,
  hooks: {
    beforeMove: () => void;
    moved: (id: string, columnId: string) => void;
    /** The label filter: moves count only the cards on screen. */
    visible: (task: Task) => boolean;
  },
) {
  const live = useAnnounce();
  const change = useUndoableChange(action);
  // The last move said, while a burst of keys may still be on its way: an edge said right after it joins it, so
  // the move that happened is never overwritten ("Posição 3 de 3 em A fazer. Já está no fim.").
  const lastMove = useRef<{ text: string; at: number } | null>(null);
  function announce(text: string, move = false) {
    const now = performance.now();
    const recent = lastMove.current && now - lastMove.current.at < BURST_MS ? lastMove.current.text : null;
    if (move) lastMove.current = { text, at: now };
    live(!move && recent ? `${recent}. ${text}` : text);
  }

  function sayWhere(id: string, within: boolean) {
    const board = readBoard(projectId, hooks.visible);
    const place = board && placeOf(board.view, id);
    if (!place) return;
    announce(
      within
        ? positionText(place.index, place.total, place.column.name)
        : movedText(place.column.name, place.index, place.total),
      true,
    );
    hooks.moved(id, place.column.id);
  }

  /**
   * Runs a move from the queue, as a change of the task (lib/item-changes.ts): it takes the Desfazer of the task's
   * last toast, and a move into the done column offers its own, as Concluir does (decision 14).
   */
  async function run(
    id: string,
    write: (board: NonNullable<ReturnType<typeof readBoard>>, task: Task) => Promise<Outcome>,
  ) {
    const undoIntent = requestId();
    const outcome = await change(
      `task:${id}`,
      async (): Promise<Outcome> => {
        const board = readBoard(projectId, hooks.visible);
        const task = board?.tasks.find((each) => each.id === id);
        if (!board || !task) return { kind: 'none' };
        try {
          return await write(board, task);
        } catch (error) {
          if (errorCode(error) === 'VERSION_CONFLICT') return { kind: 'conflict' };
          throw error;
        }
      },
      (done) => {
        if (done.kind !== 'moved' || !done.completed) return null;
        const { title, from, before, version } = done.completed;
        return {
          text: completedText(title),
          changed: TASK_CHANGED,
          undo: () =>
            onceMoreIfLost(() =>
              api.workspace.moveTask({
                requestId: undoIntent,
                id,
                expectedVersion: version,
                columnId: from,
                beforeTaskId: before,
              }),
            ),
          undone: () => hooks.moved(id, from),
        };
      },
      { queued: true },
    );
    if (!outcome || outcome.kind === 'none') return;
    if (outcome.kind === 'say') announce(outcome.text);
    else if (outcome.kind === 'conflict') announce(BOARD_CHANGED);
    else sayWhere(id, outcome.within);
  }

  /** What completing by a move leaves for its undo: none unless the task enters the done column. */
  function completion(task: Task, tasks: readonly Task[], columnId: string, version: number): Completion | null {
    const columns = cachedColumns() ?? [];
    const into = columns.find((column) => column.id === columnId);
    const was = columns.find((column) => column.id === task.columnId);
    if (!into?.isDone || was?.isDone) return null;
    return { title: displayTitle(task.title), from: task.columnId, before: followingTask(tasks, task), version };
  }

  /** A move by `moveTask`, at the revision of the board it was worked out on. */
  function place(id: string, choose: (view: readonly BoardColumnView[], task: Task) => CardSpot | string | null) {
    const intent = requestId();
    return run(id, async (board, task) => {
      const spot = choose(board.view, task);
      if (spot === null) return { kind: 'none' };
      if (typeof spot === 'string') return { kind: 'say', text: spot };
      hooks.beforeMove();
      const input = {
        requestId: intent,
        id,
        expectedVersion: task.version,
        expectedRevision: board.revision,
        ...spot,
      };
      const ack = await onceMoreIfLost(() => api.workspace.moveTask(input));
      return {
        kind: 'moved',
        within: spot.columnId === task.columnId,
        completed: completion(task, board.tasks, spot.columnId, ack.version),
      };
    });
  }

  return {
    /** ⇧ and an arrow on a card: to the column beside, at the same height, or one place in its own. */
    step: (id: string, press: KeyPress) =>
      place(id, (view) => {
        const layout = keyLayout(view);
        const next = boardKey(layout, { kind: 'card', id }, press, usesCommandKey());
        if (next?.kind === 'say') return next.text;
        if (next?.kind !== 'move-card') return null;
        return { columnId: next.columnId, beforeTaskId: beforeCardAt(layout, id, next.columnId, next.index) };
      }),
    /** "Topo da coluna" and "Fim da coluna". */
    toEdge: (id: string, edge: 'top' | 'end') =>
      place(id, (view, task) => {
        const cards = view.find((each) => each.column.id === task.columnId)?.tasks ?? [];
        const at = cards.findIndex((each) => each.id === id);
        if (edge === 'top') return at === 0 ? AT_TOP : { columnId: task.columnId, beforeTaskId: cards[0]?.id ?? null };
        return at === cards.length - 1 ? AT_END : { columnId: task.columnId, beforeTaskId: null };
      }),
    /** A drop, where `board-drop.ts` found it. */
    drop: (id: string, spot: CardSpot) => place(id, () => spot),
    /**
     * To another column from the menu (decision 13): at its end, or at the top of the done column. It changes
     * the task's fields, so it needs only the task's version.
     */
    toColumn: (id: string, columnId: string) => {
      const intent = requestId();
      return run(id, async (board, task) => {
        if (task.columnId === columnId) return { kind: 'none' };
        hooks.beforeMove();
        const input = { requestId: intent, id, expectedVersion: task.version, columnId };
        const ack = await onceMoreIfLost(() => api.workspace.updateTask(input));
        return { kind: 'moved', within: false, completed: completion(task, board.tasks, columnId, ack.version) };
      });
    },
  };
}
