import { Plus } from 'lucide-react';
import { type Task, type TaskStatus, taskStatusLabels } from '../../lib/types';
import { useDrawerContent, useTaskDrawer } from '../../shell';
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import type { useBoardDnd } from './use-board-dnd';
import type { useBoardMoves } from './use-board-moves';

const emptyCopy: Record<TaskStatus, string> = {
  todo: 'Tudo começa com um pequeno passo.',
  doing: 'O que merece sua atenção agora?',
  done: 'Cada conclusão conta.',
};

/** One column: its header, its cards in order, and "Adicionar tarefa" while the project is active. */
export function BoardColumn({
  projectId,
  status,
  index,
  tasks,
  archived,
  moves,
  dnd,
}: {
  projectId: string;
  status: TaskStatus;
  /** Its place on the board, for the ring. */
  index: number;
  tasks: Task[];
  archived: boolean;
  moves: ReturnType<typeof useBoardMoves>;
  dnd: ReturnType<typeof useBoardDnd>;
}) {
  const drawer = useTaskDrawer();
  const open = useDrawerContent();
  const openId = open?.mode === 'task' ? open.id : null;
  const label = taskStatusLabels[status];
  const add = () => drawer.newTask(projectId, { status });
  return (
    <section
      className="kanban-column"
      data-drag-over={dnd.overColumn === status || undefined}
      aria-label={label}
      {...dnd.column(status)}
    >
      <ColumnHeader status={status} index={index} count={tasks.length} onAdd={archived ? undefined : add} />
      <div className="kanban-column__body">
        {tasks.map((task, position) => (
          <TaskCard
            key={task.id}
            task={task}
            busy={moves.busy}
            dragging={dnd.draggedId === task.id}
            open={openId === task.id}
            onOpen={() => drawer.openTask(task)}
            onComplete={() => void moves.complete(task)}
            moves={{
              toColumn: (to) => void moves.move(task, to),
              up: position > 0 ? () => void moves.move(task, status, tasks[position - 1]?.id ?? null) : undefined,
              down:
                position < tasks.length - 1
                  ? () => void moves.move(task, status, tasks[position + 2]?.id ?? null)
                  : undefined,
            }}
            drag={dnd.card(task)}
          />
        ))}
        {tasks.length === 0 && <p className="kanban-column__empty">{emptyCopy[status]}</p>}
        {!archived && (
          <button type="button" className="kanban-column__new" onClick={add}>
            <Plus size={14} aria-hidden="true" />
            Adicionar tarefa
          </button>
        )}
      </div>
    </section>
  );
}
