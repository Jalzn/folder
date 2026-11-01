import './linked-task.css';
import { CheckCircle2, Circle } from 'lucide-react';
import type { Ref } from 'react';
import { useColumns, useTasks } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useTaskCompletion } from './use-task-completion';

/**
 * A task born in a document, in the document's panel: a check that completes or reopens it, with Desfazer, and
 * its title with its column's name. A task is done while it is in the done column, which is when it has a
 * completion date. `titleRef` reaches the title's button, which a list moves the focus to with the arrows.
 */
export function LinkedTask({
  task,
  onOpen,
  titleRef,
}: {
  task: Task;
  onOpen: () => void;
  titleRef?: Ref<HTMLButtonElement> | undefined;
}) {
  const action = useAction();
  const toggleDone = useTaskCompletion(action);
  // Completing reads the project's board as last read, for its place and the undo's.
  useTasks({ projectId: task.projectId });
  const column = useColumns().data?.columns.find((each) => each.id === task.columnId);
  const done = task.completedAt !== null;
  return (
    <div className="linked-task" data-done={done || undefined}>
      <button
        type="button"
        className="linked-task__check"
        onClick={() => void toggleDone(task.id, task.projectId)}
        disabled={action.busy}
        aria-label={done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
      >
        {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </button>
      <button ref={titleRef} type="button" className="linked-task__title" onClick={onOpen}>
        {task.title}
        {column && <span className="linked-task__status">{column.name}</span>}
      </button>
    </div>
  );
}
