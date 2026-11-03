import { type RefObject, useRef, useState } from 'react';
import { useTaskCompletion } from '../../components/task/use-task-completion';
import { type ColumnSummary, cachedColumns } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { useAnnounce } from '../../shell';
import { useOpenTaskId, useTaskDrawer } from '../../shell/state';
import type { WriteRunner } from '../../shell/writes';
import type { ElementRefs } from '../../ui';
import type { BoardColumnView } from './board-columns';
import type { BoardFocus, BoardKeyAction, BoardLayout, KeyPress } from './board-keys';
import type { ColumnCommand } from './ColumnMenu';
import type { MoveChoice } from './MoveTaskMenu';
import type { useBoardFocus } from './use-board-focus';
import type { useBoardMoves } from './use-board-moves';
import { useColumnActions } from './use-column-actions';
import { useTrashTask } from './use-trash-task';

/** The card or column menu open on the board, or M's "Mover para" on a card. */
export type OpenMenu = { kind: 'card' | 'move' | 'column'; id: string };

/**
 * What the board does, apart from what it draws: the menus and fields open on it, the keys' actions, the
 * column commands and the trash, each moving the focus by reference where the thing it was on went.
 */
export function useBoardCommands({
  projectId,
  view,
  editable,
  action,
  focus,
  moves,
  cards,
  layout,
}: {
  projectId: string;
  view: readonly BoardColumnView[];
  editable: boolean;
  action: WriteRunner;
  focus: ReturnType<typeof useBoardFocus>;
  moves: ReturnType<typeof useBoardMoves>;
  cards: ElementRefs<HTMLLIElement>;
  /** The board as the keys see it now. */
  layout: RefObject<BoardLayout>;
}) {
  const drawer = useTaskDrawer();
  const openId = useOpenTaskId();
  const announce = useAnnounce();
  const columnActions = useColumnActions(action);
  const completion = useTaskCompletion(action);
  const trash = useTrashTask(action);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ColumnSummary | null>(null);
  const [trashing, setTrashing] = useState<Task | null>(null);
  const moveAnchor = useRef<HTMLElement | null>(null);
  const columns = view.map((each) => each.column);

  // The card moves to another column, and so does its Desfazer: the focus follows it both ways.
  const toggleDone = (id: string) =>
    void completion(id, projectId, () => focus.followCard(id)).then((done) => done && focus.followCard(id));
  const moveCard = (id: string, choice: MoveChoice) =>
    void (choice.kind === 'column' ? moves.toColumn(id, choice.columnId) : moves.toEdge(id, choice.kind));

  async function addColumn() {
    const id = await columnActions.create(columns);
    if (id) setRenaming(id);
  }
  async function removeColumn(column: ColumnSummary, destination: ColumnSummary | null) {
    const at = columns.findIndex((each) => each.id === column.id);
    const removed = await columnActions.remove(column, destination);
    setDeleting(null);
    if (!removed) return;
    // The focus goes to the name of the column now in its place.
    const rest = new Set((cachedColumns() ?? []).map((each) => each.id));
    const left = columns.filter((each) => each.id !== column.id && rest.has(each.id));
    const place = left[Math.min(at, left.length - 1)];
    if (place) focus.followColumn(place.id);
  }
  function moveColumn(column: ColumnSummary, index: number) {
    void columnActions.move(column, columns, index).then((moved) => moved && focus.followColumn(column.id));
  }
  function columnCommand(column: ColumnSummary, command: ColumnCommand) {
    const at = columns.findIndex((each) => each.id === column.id);
    if (command === 'rename') setRenaming(column.id);
    else if (command === 'left' || command === 'right') moveColumn(column, command === 'left' ? at - 1 : at + 1);
    else if (command === 'done') void columnActions.makeDone(column);
    else if (column.taskCount > 0) setDeleting(column);
    else void removeColumn(column, null);
  }

  /** What a key of the board does, from board-keys.ts. */
  function boardAction(next: BoardKeyAction, from: BoardFocus, press: KeyPress) {
    if (next.kind === 'focus') {
      if (next.target.kind === 'card') focus.followCard(next.target.id, undefined, true);
      else focus.followColumn(next.target.id);
      return;
    }
    if (!editable) return;
    // ⇧ and an arrow on a card work out their place when the queue runs them, the ends included.
    if (from.kind === 'card' && press.shiftKey && press.key.startsWith('Arrow')) {
      void moves.step(from.id, press);
      return;
    }
    if (next.kind === 'say') announce(next.text);
    else if (next.kind === 'move-column') {
      const column = columns.find((each) => each.id === next.id);
      if (column) moveColumn(column, next.index);
    } else if (next.kind === 'move-menu') {
      moveAnchor.current = cards.get(next.id) ?? null;
      setMenu({ kind: 'move', id: next.id });
    } else if (next.kind === 'card-menu') setMenu({ kind: 'card', id: next.id });
    else if (next.kind === 'column-menu') setMenu({ kind: 'column', id: next.id });
    else if (next.kind === 'toggle-done') toggleDone(next.id);
  }

  function confirmTrash(task: Task) {
    void trash(task, layout.current).then((trashed) => {
      setTrashing(null);
      if (!trashed) return;
      if (openId === task.id) drawer.close({ force: true });
      const next = trashed.next;
      if (next?.kind === 'card') focus.followCard(next.id, undefined, true);
      else if (next) focus.followColumn(next.id);
    });
  }

  return {
    openId,
    columns,
    menu,
    setMenu,
    renaming,
    deleting,
    setDeleting,
    trashing,
    setTrashing,
    moveAnchor,
    /** A column write is under way: "+ Coluna" waits. */
    busy: columnActions.busy,
    toggleDone,
    moveCard,
    addColumn,
    removeColumn,
    columnCommand,
    boardAction,
    confirmTrash,
    newTask: (columnId: string) => drawer.newTask(projectId, { columnId }),
    openTask: (task: Task) => drawer.openTask(task),
    renameColumn: (column: ColumnSummary, name: string) => columnActions.rename(column, name),
    /** The name field left: the focus goes back to the column's name when nothing else took it. */
    renamed: (columnId: string) => {
      setRenaming(null);
      focus.followColumn(columnId, false);
    },
  };
}

export type BoardCommandsState = ReturnType<typeof useBoardCommands>;
