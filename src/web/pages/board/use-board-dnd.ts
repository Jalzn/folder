import { type DragEvent, useState } from 'react';
import type { Task, TaskStatus } from '../../lib/types';

/**
 * Dragging cards on the board, with the browser's native drag: the card being dragged, the column under it,
 * and the handlers of a column and of a card. A drop on a card puts the dragged one before it; a drop on the
 * column, at its end.
 */
export function useBoardDnd(
  tasks: readonly Task[],
  onDrop: (task: Task, status: TaskStatus, before: string | null) => void,
) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  function drop(status: TaskStatus, beforeTaskId: string | null = null) {
    const dragged = tasks.find((task) => task.id === draggedId);
    if (dragged) onDrop(dragged, status, beforeTaskId);
    setDraggedId(null);
    setOverColumn(null);
  }
  return {
    draggedId,
    overColumn,
    /** The handlers of a column, which takes a drop at its end. */
    column: (status: TaskStatus) => ({
      onDragOver: (event: DragEvent) => {
        if (!draggedId) return;
        event.preventDefault();
        setOverColumn(status);
      },
      onDragLeave: (event: DragEvent) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverColumn(null);
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        drop(status);
      },
    }),
    /** The handlers of a card, which is dragged, and takes a drop before itself. */
    card: (task: Task) => ({
      onDragStart: (event: DragEvent) => {
        setDraggedId(task.id);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
      },
      onDragEnd: () => {
        setDraggedId(null);
        setOverColumn(null);
      },
      onDragOver: (event: DragEvent) => {
        if (!draggedId || draggedId === task.id) return;
        event.preventDefault();
        event.stopPropagation();
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        drop(task.status, task.id);
      },
    }),
  };
}

export type CardDrag = ReturnType<ReturnType<typeof useBoardDnd>['card']>;
