import { type DragEvent, useEffect, useState } from 'react';
import { boardDrop, type DropColumn, type DropSpot } from './board-drop';

/** Whether the main pointer is a fine one, as a mouse: only then do cards drag (decision 19). */
function useFinePointer() {
  const [fine, setFine] = useState(() => window.matchMedia('(pointer: fine)').matches);
  useEffect(() => {
    const query = window.matchMedia('(pointer: fine)');
    const update = () => setFine(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return fine;
}

const sameSpot = (a: DropSpot | null, b: DropSpot | null) =>
  a === b ||
  (a !== null && b !== null && a.columnId === b.columnId && a.beforeTaskId === b.beforeTaskId && a.same === b.same);

/**
 * Dragging cards with the browser's own drag (docs/etapas/10-quadro-tarefa.md, "Arrastar"): the card being
 * dragged, and where it would land, which `board-drop.ts` works out from the columns' and cards' boxes under
 * the pointer. The row of columns takes the drop; a drop on the card's own place does nothing, and Esc cancels
 * the drag in the browser, which ends it here too.
 */
export function useBoardDnd({
  enabled,
  geometry,
  onDrop,
}: {
  enabled: boolean;
  /** The columns' boxes and their cards', in order, at the time of the event. */
  geometry: () => DropColumn[];
  onDrop: (id: string, spot: DropSpot) => void;
}) {
  const fine = useFinePointer();
  const [dragged, setDragged] = useState<string | null>(null);
  const [spot, setSpot] = useState<DropSpot | null>(null);
  const end = () => {
    setDragged(null);
    setSpot(null);
  };
  const at = (event: DragEvent) =>
    dragged ? boardDrop(geometry(), { x: event.clientX, y: event.clientY }, dragged) : null;
  return {
    dragged,
    spot,
    /** The handlers of the row of columns. */
    board: {
      onDragOver: (event: DragEvent) => {
        if (!dragged) return;
        const next = at(event);
        if (next) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }
        setSpot((previous) => (sameSpot(previous, next) ? previous : next));
      },
      onDragLeave: (event: DragEvent) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSpot(null);
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        const id = dragged;
        const target = at(event);
        end();
        if (id && target && !target.same) onDrop(id, target);
      },
    },
    /** The handlers of a card, which drags only with a fine pointer on an active project. */
    card: (id: string) =>
      enabled && fine
        ? {
            draggable: true,
            onDragStart: (event: DragEvent) => {
              setDragged(id);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', id);
            },
            onDragEnd: end,
          }
        : { draggable: false },
  };
}

export type CardDrag = ReturnType<ReturnType<typeof useBoardDnd>['card']>;
