import './card.css';
import { CheckCircle2, Circle, FileText } from 'lucide-react';
import type { Task } from '../../lib/types';
import { CardMenu, type CardMoves } from './CardMenu';
import type { CardDrag } from './use-board-dnd';

/**
 * A task on the board: the check that completes it, the title that opens it, its ⋯ with the moves a
 * keyboard needs, and the document it came from. Dragging moves it as well.
 */
export function TaskCard({
  task,
  busy,
  dragging,
  moves,
  onOpen,
  onComplete,
  drag,
}: {
  task: Task;
  busy: boolean;
  dragging: boolean;
  moves: CardMoves;
  onOpen: () => void;
  onComplete: () => void;
  drag: CardDrag;
}) {
  const done = task.status === 'done';
  return (
    <article
      className="task-card"
      data-done={done || undefined}
      data-dragging={dragging || undefined}
      draggable={!busy}
      {...drag}
    >
      <div className="task-card__top">
        <button
          type="button"
          className="task-card__check"
          disabled={busy}
          onClick={onComplete}
          aria-label={done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
        >
          {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        </button>
        <button type="button" className="task-card__title" onClick={onOpen}>
          {task.title}
        </button>
        <CardMenu task={task} moves={moves} onOpen={onOpen} />
      </div>
      {task.source && (
        <button type="button" className="task-card__source" onClick={onOpen}>
          <FileText size={12} aria-hidden="true" />
          <span>{task.source.documentTitle}</span>
        </button>
      )}
    </article>
  );
}
