import { Plus } from 'lucide-react';
import { useState } from 'react';
import { TASK_STATUSES, type Task, type TaskStatus, taskStatusLabels } from '../../lib/types';
import { useApp } from '../../shell';
import { ColumnRing, IconButton } from '../../ui';
import { TaskCard } from './TaskCard';
import { useBoardMoves } from './use-board-moves';

const emptyCopy: Record<TaskStatus, string> = {
  todo: 'Tudo começa com um pequeno passo.',
  doing: 'O que merece sua atenção agora?',
  done: 'Cada conclusão conta.',
};

/**
 * The project's columns in board order. Tasks move by dragging, or by the ⋯ of each card; a press on a
 * card opens its dialog. An archived project shows its board without the ways to add.
 */
export function Kanban({
  projectId,
  tasks,
  revision,
  archived,
}: {
  projectId: string;
  tasks: Task[];
  revision: number;
  archived: boolean;
}) {
  const app = useApp();
  const moves = useBoardMoves(revision);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  function drop(status: TaskStatus, beforeTaskId: string | null = null) {
    const dragged = tasks.find((task) => task.id === draggedId);
    if (dragged) void moves.move(dragged, status, beforeTaskId);
    setDraggedId(null);
    setOverColumn(null);
  }
  return (
    <div className="kanban">
      {TASK_STATUSES.map((status, columnIndex) => {
        const column = tasks.filter((task) => task.status === status);
        const label = taskStatusLabels[status];
        return (
          <section
            key={status}
            className="kanban-column"
            data-drag-over={overColumn === status || undefined}
            aria-label={label}
            onDragOver={(event) => {
              if (!draggedId) return;
              event.preventDefault();
              setOverColumn(status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverColumn(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              drop(status);
            }}
          >
            <header className="kanban-column__header">
              <ColumnRing index={columnIndex} count={TASK_STATUSES.length} />
              <h2 className="kanban-column__name">{label}</h2>
              <span className="kanban-column__count">{column.length}</span>
              {!archived && (
                <IconButton
                  label={`Adicionar tarefa em ${label}`}
                  size="sm"
                  className="kanban-column__add"
                  onPress={() => app.newTask(projectId, { status })}
                >
                  <Plus size={14} />
                </IconButton>
              )}
            </header>
            <div className="kanban-column__body">
              {column.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  busy={moves.busy}
                  dragging={draggedId === task.id}
                  onOpen={() => app.openTask(task)}
                  onComplete={() => void moves.complete(task)}
                  moves={{
                    toColumn: (to) => void moves.move(task, to),
                    up: index > 0 ? () => void moves.move(task, status, column[index - 1]?.id ?? null) : undefined,
                    down:
                      index < column.length - 1
                        ? () => void moves.move(task, status, column[index + 2]?.id ?? null)
                        : undefined,
                  }}
                  drag={{
                    onDragStart: (event) => {
                      setDraggedId(task.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', task.id);
                    },
                    onDragEnd: () => {
                      setDraggedId(null);
                      setOverColumn(null);
                    },
                    onDragOver: (event) => {
                      if (!draggedId || draggedId === task.id) return;
                      event.preventDefault();
                      event.stopPropagation();
                    },
                    onDrop: (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      drop(status, task.id);
                    },
                  }}
                />
              ))}
              {column.length === 0 && <p className="kanban-column__empty">{emptyCopy[status]}</p>}
              {!archived && (
                <button type="button" className="kanban-column__new" onClick={() => app.newTask(projectId, { status })}>
                  <Plus size={14} aria-hidden="true" />
                  Adicionar tarefa
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
