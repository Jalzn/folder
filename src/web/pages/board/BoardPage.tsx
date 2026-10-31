import './board.css';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useProject, useTasks } from '../../lib/queries';
import { PageFrame, useApp } from '../../shell';
import { Button, ErrorNotice, PageHeader, Spinner, useToast } from '../../ui';
import { Kanban } from './Kanban';

const count = (n: number) => `${n} ${n === 1 ? 'tarefa' : 'tarefas'}`;

/**
 * `/projetos/$projectId/quadro`: the project's board, with Nova tarefa in the page bar. `?tarefa=` opens
 * that task's dialog once the board has it, and leaves the address.
 */
export function BoardPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/quadro' });
  const { tarefa } = useSearch({ from: '/projetos/$projectId/quadro' });
  const navigate = useNavigate({ from: '/projetos/$projectId/quadro' });
  const app = useApp();
  const toast = useToast();
  const project = useProject(projectId);
  const tasks = useTasks({ projectId });
  const list = tasks.data?.tasks;
  const { openTask } = app;
  const opened = useRef<string | null>(null);
  // Once the address drops ?tarefa=, the same task can be asked for again, as from ⌘K.
  useEffect(() => {
    if (!tarefa) opened.current = null;
  }, [tarefa]);
  useEffect(() => {
    // Once per address: the dialog's own state changes must not open it again.
    if (!tarefa || !list || opened.current === tarefa) return;
    opened.current = tarefa;
    const task = list.find((item) => item.id === tarefa);
    if (task) openTask(task);
    else toast('Esta tarefa não está mais neste quadro.', 'error');
    void navigate({ search: {}, replace: true });
  }, [tarefa, list, openTask, toast, navigate]);
  if (!project) return null;
  const archived = Boolean(project.archivedAt);
  return (
    <PageFrame
      actions={
        !archived && (
          <Button icon={<Plus size={16} />} onPress={() => app.newTask(projectId)}>
            Nova tarefa
          </Button>
        )
      }
    >
      <div className="board-page">
        <PageHeader title="Quadro" description={list ? count(list.length) : undefined} />
        {tasks.isPending ? (
          <Spinner />
        ) : tasks.error ? (
          <ErrorNotice error={tasks.error} retry={() => void tasks.refetch()} />
        ) : (
          <Kanban projectId={projectId} tasks={tasks.data.tasks} revision={tasks.data.revision} archived={archived} />
        )}
      </div>
    </PageFrame>
  );
}
