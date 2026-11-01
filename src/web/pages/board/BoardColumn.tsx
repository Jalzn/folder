import { Plus } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import type { BoardColumnView } from './board-columns';
import type { DropSpot } from './board-drop';

/**
 * One column of the board (docs/etapas/10-quadro-tarefa.md, "Colunas"): its header, its cards in order with the
 * drop line where a dragged card would land, "Nada aqui." when empty, and "+ Nova tarefa", shown on hover or
 * focus and always in an empty column, except in the done column and in an archived project.
 */
export function BoardColumn({
  view,
  header,
  cards,
  spot,
  editable,
  emptyText = 'Nada aqui.',
  footer,
  sectionRef,
  onAdd,
}: {
  view: BoardColumnView;
  header: ReactNode;
  /** The cards, by task ID, in the column's order. */
  cards: ReadonlyMap<string, ReactNode>;
  /** Where a dragged card would land, when in this column. */
  spot: DropSpot | null;
  editable: boolean;
  /** "Nada aqui.", or what the label filter left out. */
  emptyText?: string;
  /** After the cards, as the done column's "Mais 23 concluídas antes de 19 out →". */
  footer?: ReactNode;
  sectionRef: (element: HTMLElement | null) => () => void;
  onAdd: () => void;
}) {
  const { column, tasks } = view;
  const line = <li className="board-drop-line" aria-hidden="true" />;
  const showLine = spot !== null && !spot.same;
  return (
    <section
      ref={sectionRef}
      className="board-column"
      aria-label={column.name}
      data-column-id={column.id}
      data-done={column.isDone || undefined}
      data-empty={tasks.length === 0 || undefined}
      data-drop={spot !== null || undefined}
    >
      {header}
      <div className="board-column__body">
        {tasks.length > 0 ? (
          <ul className="board-column__cards" aria-label={`Tarefas em ${column.name}`}>
            {tasks.map((task) => (
              <Fragment key={task.id}>
                {showLine && spot.beforeTaskId === task.id && line}
                {cards.get(task.id)}
              </Fragment>
            ))}
            {showLine && spot.beforeTaskId === null && line}
          </ul>
        ) : (
          <>
            {showLine && <ul className="board-column__cards">{line}</ul>}
            <p className="board-column__empty">{emptyText}</p>
          </>
        )}
        {editable && !column.isDone && (
          <button
            type="button"
            className="board-column__add"
            tabIndex={-1}
            aria-label={`Nova tarefa em ${column.name}`}
            onClick={onAdd}
          >
            <Plus size={14} aria-hidden="true" />
            Nova tarefa
          </button>
        )}
        {footer}
      </div>
    </section>
  );
}
