import type { CivilDate } from '@tinyfold/core/domain';
import { type CSSProperties, type ReactNode, type RefObject, useImperativeHandle, useRef } from 'react';
import type { LabelSummary } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { useAction } from '../../shell/writes';
import { useElementRefs } from '../../ui';
import { AddColumn } from './AddColumn';
import { BoardColumn } from './BoardColumn';
import { BoardOverlays } from './BoardOverlays';
import { type BoardColumnView, keyLayout } from './board-columns';
import { BoardContext } from './board-context';
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import { useBoardCommands } from './use-board-commands';
import { useBoardDnd } from './use-board-dnd';
import { useBoardFocus } from './use-board-focus';
import { useBoardKeyboard } from './use-board-keyboard';
import { useBoardMoves } from './use-board-moves';
import { useFlip } from './use-flip';

/** What the page's ⋯ asks of the board. */
export interface BoardCommands {
  addColumn?: (() => void) | undefined;
}

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
  today: CivilDate;
  archived: boolean;
  commands: RefObject<BoardCommands>;
}) {
  const editable = !archived;
  const action = useAction();
  const cards = useElementRefs<HTMLLIElement>();
  const titles = useElementRefs<HTMLButtonElement>();
  const names = useElementRefs<HTMLButtonElement>();
  const sections = useElementRefs<HTMLElement>();
  const row = useRef<HTMLDivElement>(null);
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
  const board = useBoardCommands({ projectId, view, editable, action, focus, moves, cards, layout: latestLayout });
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
  const onKeyDown = useBoardKeyboard(() => latestLayout.current, board.boardAction);

  // The page's ⋯ holds one stable "Nova coluna", which runs this render's.
  const latestAdd = useRef(board.addColumn);
  latestAdd.current = board.addColumn;
  useImperativeHandle(commands, () => ({ addColumn: editable ? () => void latestAdd.current() : undefined }), [
    editable,
  ]);

  const context = { editable, labels, today, isStop: focus.isStop, refs: { cards, titles, names }, dnd, board };
  return (
    <BoardContext.Provider value={context}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: The board's keys go to the cards and names in it. */}
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
          const place = { column, index, count: view.length, columns: board.columns };
          const cardsOf = new Map(tasks.map((task) => [task.id, <TaskCard key={task.id} task={task} place={place} />]));
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
              onAdd={() => board.newTask(column.id)}
              header={<ColumnHeader column={column} index={index} count={tasks.length} total={view.length} />}
            />
          );
        })}
        {editable && <AddColumn busy={board.busy} onAdd={() => void board.addColumn()} />}
        <BoardOverlays board={board} view={view} pending={action.busy} />
      </div>
    </BoardContext.Provider>
  );
}
