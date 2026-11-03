import './card.css';
import { isOverdue } from '@tinyfold/workspace/domain';
import { useId, useSyncExternalStore } from 'react';
import { TaskMeta } from '../../components/task/TaskMeta';
import { isPendingSave, pendingSaves, subscribePendingSaves } from '../../lib/autosave/save-registry';
import type { ColumnSummary } from '../../lib/queries';
import { displayTitle, type Task } from '../../lib/types';
import { ColumnRing } from '../../ui';
import { useBoard } from './board-context';
import { CardMenu } from './CardMenu';
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
export function TaskCard({ task, place }: { task: Task; place: CardColumn }) {
  const { editable, labels, today, isStop, refs, dnd, board } = useBoard();
  const { menu, setMenu } = board;
  const late = isOverdue(task.dueOn, today, place.column.isDone);
  const open = board.openId === task.id;
  const metaId = useId();
  // Text typed in the drawer that the server has not confirmed yet, in this tab.
  const unsaved = isPendingSave(useSyncExternalStore(subscribePendingSaves, pendingSaves), 'task', task.id);
  const { column } = place;
  const title = displayTitle(task.title);
  return (
    <li
      ref={refs.cards.ref(task.id)}
      className="task-card"
      data-done={column.isDone || undefined}
      data-open={open || undefined}
      data-dragging={dnd.dragged === task.id || undefined}
      {...dnd.card(task.id)}
    >
      <span className="task-card__ring">
        <ColumnRing index={place.index} count={place.count} isDone={column.isDone} />
      </span>
      <button
        ref={refs.titles.ref(task.id)}
        type="button"
        className="task-card__title"
        tabIndex={isStop('card', task.id) ? 0 : -1}
        aria-describedby={metaId}
        aria-current={open || undefined}
        {...{ [CARD_ATTRIBUTE]: task.id }}
        onClick={() => board.openTask(task)}
      >
        {title}
      </button>
      {unsaved && <span className="task-card__unsaved" aria-hidden="true" />}
      <TaskMeta
        id={metaId}
        dueOn={task.dueOn}
        checklist={task.checklist}
        labels={task.labelIds.flatMap((labelId) => labels.get(labelId) ?? [])}
        late={late}
        shown={2}
        unsaved={unsaved}
      />
      {editable && (
        <CardMenu
          title={title}
          columns={place.columns}
          columnId={task.columnId}
          done={column.isDone}
          open={menu?.kind === 'card' && menu.id === task.id}
          onOpenChange={(next) => setMenu(next ? { kind: 'card', id: task.id } : null)}
          onOpen={() => board.openTask(task)}
          onMove={(choice) => board.moveCard(task.id, choice)}
          onToggleDone={() => board.toggleDone(task.id)}
          onTrash={() => board.setTrashing(task)}
        />
      )}
    </li>
  );
}
