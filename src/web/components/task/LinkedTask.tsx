import './linked-task.css';
import { CheckCircle2, Circle } from 'lucide-react';
import { api } from '../../lib/api';
import { type Task, taskStatusLabels } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';

/** A task born in a document, in the document's panel: a check that completes or reopens it, and its title. */
export function LinkedTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const action = useAction();
  const request = useRequest();
  const done = task.status === 'done';
  async function toggle() {
    const input = { id: task.id, expectedVersion: task.version, status: done ? ('todo' as const) : ('done' as const) };
    await action.run(
      () => api.workspace.updateTask({ ...input, requestId: request.for(input) }),
      () => request.clear(),
    );
  }
  return (
    <div className="linked-task" data-done={done || undefined}>
      <button
        type="button"
        className="linked-task__check"
        onClick={() => void toggle()}
        disabled={action.busy}
        aria-label={done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
      >
        {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </button>
      <button type="button" className="linked-task__title" onClick={onOpen}>
        {task.title}
        <span className="linked-task__status">{taskStatusLabels[task.status]}</span>
      </button>
    </div>
  );
}
