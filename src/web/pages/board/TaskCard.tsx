import './card.css';
import { useId, useSyncExternalStore } from 'react';
import type { ColumnSummary, LabelSummary } from '../../lib/queries';
import { isPendingSave, pendingSaves, subscribePendingSaves } from '../../lib/save-registry';
import { displayTitle, type Task } from '../../lib/types';
import { ColumnRing } from '../../ui';
import { CardMenu } from './CardMenu';
import { CardMeta } from './CardMeta';
import type { MoveChoice } from './MoveTaskMenu';
import type { CardDrag } from './use-board-dnd';
import { CARD_ATTRIBUTE } from './use-board-keyboard';

/** A card's place on the board, for its ring and its menu. */
export interface CardColumn {
  column: ColumnSummary;
  index: number;
  count: number;
  columns: readonly ColumnSummary[];
}

/**
 * A task on the board (docs/etapas/10-quadro-tarefa.md, "Card"): the column's ring, the title, which is the
 * button that takes the focus and whose press anywhere on the card opens the drawer, the meta line and the ⋯.
 * The ring only shows the column (decision 18): Concluir is in the ⋯ and on ⌘↵. A 6 px dot in --late marks
 * text not saved yet. An archived project's card only opens.
 */
export function TaskCard({
  task,
  place,
  labels,
  late,
  open,
  active,
  editable,
  dragging,
  drag,
  menuOpen,
  cardRef,
  titleRef,
  onMenuOpenChange,
  onOpen,
  onMove,
  onToggleDone,
  onTrash,
}: {
  task: Task;
  place: CardColumn;
  labels: ReadonlyMap<string, LabelSummary>;
  late: boolean;
  /** It is the task open in the drawer. */
  open: boolean;
  /** Its title is the board's Tab stop. */
  active: boolean;
  editable: boolean;
  dragging: boolean;
  drag: CardDrag;
  menuOpen: boolean;
  cardRef: (element: HTMLLIElement | null) => () => void;
  titleRef: (element: HTMLButtonElement | null) => () => void;
  onMenuOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onMove: (choice: MoveChoice) => void;
  onToggleDone: () => void;
  onTrash: () => void;
}) {
  const metaId = useId();
  // Text typed in the drawer that the server has not confirmed yet, in this tab.
  const unsaved = isPendingSave(useSyncExternalStore(subscribePendingSaves, pendingSaves), 'task', task.id);
  const { column } = place;
  const title = displayTitle(task.title);
  return (
    <li
      ref={cardRef}
      className="task-card"
      data-done={column.isDone || undefined}
      data-open={open || undefined}
      data-dragging={dragging || undefined}
      {...drag}
    >
      <span className="task-card__ring">
        <ColumnRing index={place.index} count={place.count} isDone={column.isDone} />
      </span>
      <button
        ref={titleRef}
        type="button"
        className="task-card__title"
        tabIndex={active ? 0 : -1}
        aria-describedby={metaId}
        aria-current={open || undefined}
        {...{ [CARD_ATTRIBUTE]: task.id }}
        onClick={onOpen}
      >
        {title}
      </button>
      {unsaved && <span className="task-card__unsaved" aria-hidden="true" />}
      <CardMeta id={metaId} task={task} late={late} labels={labels} unsaved={unsaved} />
      {editable && (
        <CardMenu
          title={title}
          columns={place.columns}
          columnId={task.columnId}
          done={column.isDone}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          onOpen={onOpen}
          onMove={onMove}
          onToggleDone={onToggleDone}
          onTrash={onTrash}
        />
      )}
    </li>
  );
}
