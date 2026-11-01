import { isOverdue } from '@tinyfold/workspace/domain';
import { type CSSProperties, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { TrashTaskDialog } from '../../components/task/TrashTaskDialog';
import { useTaskCompletion } from '../../components/task/use-task-completion';
import { type ColumnSummary, cachedColumns, type LabelSummary } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useAnnounce } from '../../shell/announcer';
import { useDrawerContent, useTaskDrawer } from '../../shell/task-drawer-state';
import { AddColumn } from './AddColumn';
import { BoardColumn } from './BoardColumn';
import { type BoardColumnView, keyLayout } from './board-columns';
import type { BoardKeyAction, KeyPress } from './board-keys';
import { createRefs } from './board-refs';
import { ColumnHeader } from './ColumnHeader';
import type { ColumnCommand } from './ColumnMenu';
import { DeleteColumnDialog } from './DeleteColumnDialog';
import { type MoveChoice, MoveTaskPopover } from './MoveTaskMenu';
import { TaskCard } from './TaskCard';
import { useBoardDnd } from './use-board-dnd';
import { useBoardFocus } from './use-board-focus';
import { useBoardKeyboard } from './use-board-keyboard';
import { useBoardMoves } from './use-board-moves';
import { useColumnActions } from './use-column-actions';
import { useFlip } from './use-flip';
import { useTrashTask } from './use-trash-task';

/** What the page's ⋯ asks of the board. */
export interface BoardCommands {
  addColumn?: (() => void) | undefined;
}

type OpenMenu = { kind: 'card' | 'move' | 'column'; id: string };

/** Half the gap between columns: a drop there still lands in the nearest one. */
const HALF_GAP = 6;

/**
 * The project's columns in a row that scrolls sideways (docs/etapas/10-quadro-tarefa.md, "Quadro"): one Tab
 * stop, the arrows between cards and columns' names, ⇧ and the arrows to move, the menus, dragging, and "+
 * Coluna". The board's writes go one at a time through one queue. An archived project shows its board to
 * read: the cards open, and nothing moves.
 */
export function BoardColumns({
  projectId,
  view,
  labels,
  today,
  archived,
  commands,
  visible,
  emptyText,
  doneFooter,
}: {
  projectId: string;
  view: BoardColumnView[];
  /** The label filter's test of a task. */
  visible: (task: Task) => boolean;
  /** What an empty column says: "Nada aqui.", or what the filter left out. */
  emptyText: (columnId: string) => string;
  /** Under the done column's cards. */
  doneFooter?: ReactNode;
  labels: ReadonlyMap<string, LabelSummary>;
  today: string;
  archived: boolean;
  commands: RefObject<BoardCommands>;
}) {
  const editable = !archived;
  const drawer = useTaskDrawer();
  const content = useDrawerContent();
  const openId = content?.mode === 'task' ? content.id : null;
  const announce = useAnnounce();
  const action = useAction();
  const [cards] = useState(() => createRefs<HTMLLIElement>());
  const [titles] = useState(() => createRefs<HTMLButtonElement>());
  const [names] = useState(() => createRefs<HTMLButtonElement>());
  const [sections] = useState(() => createRefs<HTMLElement>());
  const row = useRef<HTMLDivElement>(null);
  const moveAnchor = useRef<HTMLElement | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ColumnSummary | null>(null);
  const [trashing, setTrashing] = useState<Task | null>(null);
  const columns = view.map((each) => each.column);
  const layout = keyLayout(view);
  const latestLayout = useRef(layout);
  latestLayout.current = layout;

  const focus = useBoardFocus({ projectId, layout, titles, names, row });
  const flip = useFlip(cards.elements, view);
  const moves = useBoardMoves(projectId, action, {
    beforeMove: flip,
    moved: (id, columnId) => focus.followCard(id, columnId),
    visible,
  });
  const columnActions = useColumnActions(action);
  const completion = useTaskCompletion(action);
  const trash = useTrashTask(action);
  const dnd = useBoardDnd({
    enabled: editable,
    geometry: () =>
      view.map(({ column, tasks }) => {
        const box = sections.get(column.id)?.getBoundingClientRect();
        return {
          id: column.id,
          left: (box?.left ?? 0) - HALF_GAP,
          right: (box?.right ?? -HALF_GAP * 2) + HALF_GAP,
          cards: tasks.flatMap((task) => {
            const card = cards.get(task.id)?.getBoundingClientRect();
            return card ? [{ id: task.id, top: card.top, bottom: card.bottom }] : [];
          }),
        };
      }),
    onDrop: (id, spot) => void moves.drop(id, { columnId: spot.columnId, beforeTaskId: spot.beforeTaskId }),
  });

  // The card moves to another column, and so does its Desfazer: the focus follows it both ways.
  const toggleDone = (id: string) =>
    void completion(id, projectId, () => focus.followCard(id)).then((done) => done && focus.followCard(id));
  const moveCard = (id: string, choice: MoveChoice) =>
    void (choice.kind === 'column' ? moves.toColumn(id, choice.columnId) : moves.toEdge(id, choice.kind));
  async function addColumn() {
    const id = await columnActions.create(columns);
    if (id) setRenaming(id);
  }
  useEffect(() => {
    commands.current.addColumn = editable ? () => void addColumn() : undefined;
  });

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

  function boardAction(next: BoardKeyAction, from: { kind: string; id: string }, press: KeyPress) {
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
  const onKeyDown = useBoardKeyboard(() => latestLayout.current, boardAction);

  function confirmTrash(task: Task) {
    void trash(task, latestLayout.current).then((trashed) => {
      setTrashing(null);
      if (!trashed) return;
      if (openId === task.id) drawer.close({ force: true });
      const next = trashed.next;
      if (next?.kind === 'card') focus.followCard(next.id, undefined, true);
      else if (next) focus.followColumn(next.id);
    });
  }

  const moving = menu?.kind === 'move' ? view.flatMap((each) => each.tasks).find((task) => task.id === menu.id) : null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The board's keys go to the cards and names in it.
    <div
      ref={row}
      className="board-columns"
      style={{ '--board-columns': view.length } as CSSProperties}
      onKeyDown={onKeyDown}
      onFocus={focus.onFocus}
      {...dnd.board}
    >
      {view.map((each) => {
        const { column, index, tasks } = each;
        const place = { column, index, count: view.length, columns };
        const add = () => drawer.newTask(projectId, { columnId: column.id });
        const cardsOf = new Map(
          tasks.map((task) => [
            task.id,
            <TaskCard
              key={task.id}
              task={task}
              place={place}
              labels={labels}
              late={isOverdue(task.dueOn, today, column.isDone)}
              open={openId === task.id}
              active={focus.isStop('card', task.id)}
              editable={editable}
              dragging={dnd.dragged === task.id}
              drag={dnd.card(task.id)}
              menuOpen={menu?.kind === 'card' && menu.id === task.id}
              cardRef={cards.ref(task.id)}
              titleRef={titles.ref(task.id)}
              onMenuOpenChange={(open) => setMenu(open ? { kind: 'card', id: task.id } : null)}
              onOpen={() => drawer.openTask(task)}
              onMove={(choice) => moveCard(task.id, choice)}
              onToggleDone={() => toggleDone(task.id)}
              onTrash={() => setTrashing(task)}
            />,
          ]),
        );
        return (
          <BoardColumn
            key={column.id}
            view={each}
            cards={cardsOf}
            spot={dnd.spot?.columnId === column.id ? dnd.spot : null}
            editable={editable}
            emptyText={emptyText(column.id)}
            footer={column.isDone ? doneFooter : undefined}
            sectionRef={sections.ref(column.id)}
            onAdd={add}
            header={
              <ColumnHeader
                column={column}
                index={index}
                count={tasks.length}
                total={view.length}
                editable={editable}
                active={focus.isStop('column', column.id)}
                renaming={renaming === column.id}
                taken={columns.filter((other) => other.id !== column.id).map((other) => other.name)}
                menuOpen={menu?.kind === 'column' && menu.id === column.id}
                nameRef={names.ref(column.id)}
                onMenuOpenChange={(open) => setMenu(open ? { kind: 'column', id: column.id } : null)}
                onCommand={(command) => columnCommand(column, command)}
                onAdd={add}
                onRename={(name) => columnActions.rename(column, name)}
                onRenamed={() => {
                  setRenaming(null);
                  focus.followColumn(column.id, false);
                }}
              />
            }
          />
        );
      })}
      {editable && <AddColumn busy={columnActions.busy} onAdd={() => void addColumn()} />}
      {moving && (
        <MoveTaskPopover
          columns={columns}
          columnId={moving.columnId}
          triggerRef={moveAnchor}
          onClose={() => setMenu(null)}
          onChoose={(choice) => moveCard(moving.id, choice)}
        />
      )}
      {deleting && (
        <DeleteColumnDialog
          column={deleting}
          columns={columns}
          pending={action.busy}
          onClose={() => setDeleting(null)}
          onConfirm={(destination) => void removeColumn(deleting, destination)}
        />
      )}
      {trashing && (
        <TrashTaskDialog
          task={trashing}
          pending={action.busy}
          onClose={() => setTrashing(null)}
          onConfirm={() => confirmTrash(trashing)}
        />
      )}
    </div>
  );
}
