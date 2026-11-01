import { TASK_STATUSES, type Task } from '../../lib/types';
import { BoardColumn } from './BoardColumn';
import { useBoardDnd } from './use-board-dnd';
import { useBoardMoves } from './use-board-moves';

/**
 * The project's columns in board order. Tasks move by dragging, or by the ⋯ of each card; a press on a
 * card opens it. An archived project shows its board without the ways to add.
 */
export function BoardColumns({
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
  const moves = useBoardMoves(revision);
  const dnd = useBoardDnd(tasks, (task, status, before) => void moves.move(task, status, before));
  return (
    <div className="kanban">
      {TASK_STATUSES.map((status, index) => (
        <BoardColumn
          key={status}
          projectId={projectId}
          status={status}
          index={index}
          tasks={tasks.filter((task) => task.status === status)}
          archived={archived}
          moves={moves}
          dnd={dnd}
        />
      ))}
    </div>
  );
}
