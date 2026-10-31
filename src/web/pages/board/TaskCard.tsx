import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Circle, FileText } from 'lucide-react';
import type { DragEvent } from 'react';
import { TASK_STATUSES, type Task, taskStatusLabels } from '../../lib/types';
import { ActionMenu } from '../../ui';

export interface CardMoves {
  /** To another column, at its end. */
  toColumn: (status: Task['status']) => void;
  up?: (() => void) | undefined;
  down?: (() => void) | undefined;
}

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
  drag: {
    onDragStart: (event: DragEvent) => void;
    onDragEnd: () => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
  };
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
        <ActionMenu
          label={`Opções de ${task.title}`}
          items={[
            { label: 'Editar tarefa', action: onOpen },
            ...TASK_STATUSES.filter((status) => status !== task.status).map((status) => ({
              label: `Mover para ${taskStatusLabels[status]}`,
              icon: <ArrowRight size={16} />,
              action: () => moves.toColumn(status),
            })),
            { label: 'Mover para cima', icon: <ArrowUp size={16} />, disabled: !moves.up, action: () => moves.up?.() },
            {
              label: 'Mover para baixo',
              icon: <ArrowDown size={16} />,
              disabled: !moves.down,
              action: () => moves.down?.(),
            },
          ]}
        />
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
