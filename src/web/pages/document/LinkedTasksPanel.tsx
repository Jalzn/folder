import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { LinkedTask } from '../../components/task';
import { countOf } from '../../lib/count';
import type { Task } from '../../lib/types';
import { useTaskDrawer } from '../../shell';
import { ErrorNotice, IconButton, Spinner } from '../../ui';

/** The tasks born in this document, open first; the done ones fold under a toggle. */
export function LinkedTasksPanel({
  tasks,
  pending,
  error,
  onClose,
}: {
  tasks: Task[];
  pending: boolean;
  error: Error | null;
  onClose: () => void;
}) {
  const drawer = useTaskDrawer();
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((task) => task.status !== 'done');
  const done = tasks.filter((task) => task.status === 'done');
  const row = (task: Task) => <LinkedTask key={task.id} task={task} onOpen={() => drawer.openTask(task)} />;
  return (
    <aside id="linked-tasks-panel" className="linked-tasks" aria-labelledby="linked-tasks-title">
      <header className="linked-tasks__header">
        <h2 id="linked-tasks-title" className="linked-tasks__title">
          Neste documento
        </h2>
        <IconButton label="Recolher tarefas" size="sm" onPress={onClose}>
          <X size={14} />
        </IconButton>
      </header>
      <p className="linked-tasks__hint">Próximos passos que nasceram daqui.</p>
      {pending ? (
        <Spinner />
      ) : error ? (
        <ErrorNotice error={error} />
      ) : open.length ? (
        open.map(row)
      ) : (
        <div className="linked-tasks__empty">
          <p>Nenhum passo em aberto.</p>
          <p>Selecione um trecho do texto e escolha “Criar tarefa”.</p>
        </div>
      )}
      {done.length > 0 && (
        <>
          <button
            type="button"
            className="linked-tasks__toggle"
            onClick={() => setShowDone(!showDone)}
            aria-expanded={showDone}
          >
            <ChevronDown size={14} aria-hidden="true" />
            {countOf(done.length, 'concluída', 'concluídas')}
          </button>
          {showDone && done.map(row)}
        </>
      )}
      <p className="linked-tasks__footnote">
        Os checklists do texto ficam no documento. As tarefas aparecem também no quadro.
      </p>
    </aside>
  );
}
