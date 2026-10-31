import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  Folder,
  Link2,
  LoaderCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, errorMessage, refreshWorkspace, reportSessionError } from '../lib/api';
import { useProjects, useTasks } from '../lib/queries';
import { TASK_STATUSES, type Task, type TaskStatus, taskStatusLabels } from '../lib/types';
import { useAction } from '../lib/use-action';
import { useRequest } from '../lib/use-request';
import { itemPath } from '../router/paths';
import { ActionMenu, Dialog, ErrorNotice, PageHeader, Spinner, useToast } from '../ui';

export type TaskOrigin = { documentId: string; blockId?: string | null; excerpt: string; expectedVersion?: number };

export function TaskDialog({
  open,
  onClose,
  task,
  initialProjectId = null,
  initialStatus = 'todo',
  source,
  initialTitle = '',
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | undefined;
  initialProjectId?: string | null;
  initialStatus?: TaskStatus;
  source?: TaskOrigin | undefined;
  initialTitle?: string;
}) {
  const [title, setTitle] = useState(task?.title ?? initialTitle);
  const [projectId, setProjectId] = useState<string | null>(task?.projectId ?? initialProjectId);
  const [status, setStatus] = useState(task?.status ?? initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const projects = useProjects(true);
  const request = useRequest();
  const toast = useToast();
  const opening = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (open && !opening.current) {
      setTitle(task?.title ?? initialTitle);
      setProjectId(task?.projectId ?? initialProjectId);
      setStatus(task?.status ?? initialStatus);
      setError(null);
      setConfirmDelete(false);
      request.clear();
    }
    opening.current = open;
  }, [open, task, initialTitle, initialProjectId, initialStatus, request]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (task) {
        const input = { id: task.id, expectedVersion: task.version, title: title.trim(), projectId, status };
        await api.workspace.updateTask({ ...input, requestId: request.for(input) });
      } else {
        const input = { title: title.trim(), projectId, status, ...(source ? { source } : {}) };
        await api.workspace.createTask({ ...input, requestId: request.for(input) });
      }
      request.clear();
      await refreshWorkspace();
      toast(task ? 'Tarefa atualizada.' : 'Tarefa criada. Um próximo passo definido.');
      onClose();
    } catch (e) {
      reportSessionError(e);
      setError(errorMessage(e));
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!task || busy) return;
    setBusy(true);
    setError(null);
    const input = { id: task.id, expectedVersion: task.version };
    try {
      await api.workspace.deleteTask({ ...input, requestId: request.for(input) });
      request.clear();
      await refreshWorkspace();
      onClose();
      toast('Tarefa excluída.');
    } catch (e) {
      reportSessionError(e);
      setError(errorMessage(e));
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }
  const origin = task?.source ?? source;
  return (
    <Dialog title={task ? 'Detalhes da tarefa' : 'Um próximo passo'} open={open} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          {task ? 'Título da tarefa' : 'O que você quer fazer?'}
          <textarea
            autoFocus
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Organizar as referências"
            maxLength={300}
            required
            aria-label="Título da tarefa"
          />
        </label>
        {task ? (
          <div className="task-properties">
            <label className="field">
              Estado
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {taskStatusLabels[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Projeto
              <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}>
                <option value="">Sem projeto</option>
                {projects.data?.map((p) => (
                  <option key={p.id} value={p.id} disabled={Boolean(p.archivedAt) && p.id !== projectId}>
                    {p.name}
                    {p.archivedAt ? ' (arquivado)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <details className="optional-fields">
            <summary>
              <Folder size={15} />
              {projects.data?.find((p) => p.id === projectId)?.name ?? 'Sem projeto'}
              <span>Alterar</span>
            </summary>
            <label className="field">
              Projeto
              <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}>
                <option value="">Sem projeto</option>
                {projects.data
                  ?.filter((p) => !p.archivedAt || p.id === projectId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          </details>
        )}
        {origin && (
          <div className="task-source">
            <span className="eyebrow">
              <Link2 size={13} />
              CONTEXTO
            </span>
            <blockquote>{origin.excerpt}</blockquote>
            {task?.source &&
              (task.source.available ? (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    onClose();
                    const documentId = task.source?.documentId;
                    // The task's project is the best guess; the document page moves to its own if it differs.
                    if (documentId)
                      void navigate({
                        href: itemPath(
                          'document',
                          { id: documentId, projectId: task.projectId },
                          task.source?.blockId ?? undefined,
                        ),
                      });
                  }}
                >
                  <FileText size={15} />
                  {task.source.documentTitle}
                  <ArrowRight size={14} />
                </button>
              ) : (
                <p className="muted small">O documento está na lixeira. A tarefa continua aqui.</p>
              ))}
            {task?.source?.available && !task.source.blockAvailable && (
              <p className="muted small">O trecho original foi removido. Você ainda pode abrir o documento.</p>
            )}
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {confirmDelete ? (
          <div className="delete-confirm">
            <p>Excluir esta tarefa? O texto do documento será preservado.</p>
            <div className="dialog-actions">
              <button type="button" className="button secondary" onClick={() => setConfirmDelete(false)}>
                Manter tarefa
              </button>
              <button type="button" className="button danger" disabled={busy} onClick={() => void remove()}>
                Excluir tarefa
              </button>
            </div>
          </div>
        ) : (
          <div className="dialog-actions">
            {task && (
              <button
                className="icon-button danger-text action-left"
                aria-label="Excluir tarefa"
                type="button"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={17} />
              </button>
            )}
            <button className="button secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={busy || !title.trim()}>
              {busy && <LoaderCircle size={15} className="spin" />}
              {busy ? 'Salvando…' : task ? 'Salvar tarefa' : 'Criar tarefa'}
            </button>
          </div>
        )}
      </form>
    </Dialog>
  );
}

/** `/projetos/$projectId/quadro`: the project's board. */
export function BoardPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/quadro' });
  const projects = useProjects(true);
  const archived = Boolean(projects.data?.find((project) => project.id === projectId)?.archivedAt);
  return (
    <div className="page board-page">
      <PageHeader title="Quadro" description="Pequenos passos. Projetos em movimento." />
      <Kanban projectId={projectId} archived={archived} />
    </div>
  );
}

export function Kanban({ projectId, archived = false }: { projectId: string; archived?: boolean }) {
  const tasks = useTasks({ projectId });
  const [newStatus, setNewStatus] = useState<TaskStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const selected = tasks.data?.tasks.find((task) => task.id === selectedId);
  const action = useAction();
  const request = useRequest();
  async function move(task: Task, status: TaskStatus, beforeTaskId: string | null = null) {
    if (!tasks.data || task.id === beforeTaskId) return;
    const input = {
      id: task.id,
      expectedVersion: task.version,
      expectedRevision: tasks.data.revision,
      status,
      beforeTaskId,
    };
    await action.run(
      () => api.workspace.moveTask({ ...input, requestId: request.for(input) }),
      () => request.clear(),
    );
  }
  async function complete(task: Task) {
    const input = {
      id: task.id,
      expectedVersion: task.version,
      status: task.status === 'done' ? ('todo' as const) : ('done' as const),
    };
    await action.run(
      () => api.workspace.updateTask({ ...input, requestId: request.for(input) }),
      () => request.clear(),
    );
  }
  function drop(status: TaskStatus, beforeTaskId: string | null = null) {
    const dragged = tasks.data?.tasks.find((task) => task.id === draggedId);
    if (dragged) void move(dragged, status, beforeTaskId);
    setDraggedId(null);
    setOverColumn(null);
  }
  if (tasks.isPending) return <Spinner />;
  if (tasks.error) return <ErrorNotice error={tasks.error} retry={() => void tasks.refetch()} />;
  const total = tasks.data?.tasks.length ?? 0;
  const completed = tasks.data?.tasks.filter((t) => t.status === 'done').length ?? 0;
  return (
    <>
      <div className="board-summary">
        <span>
          <span className="status-dot doing" />
          {total - completed} {total - completed === 1 ? 'passo em aberto' : 'passos em aberto'}
        </span>
        <span>
          <Check size={14} />
          {completed} {completed === 1 ? 'concluído' : 'concluídos'}
        </span>
        {action.busy && (
          <span role="status">
            <LoaderCircle className="spin" size={14} />
            Salvando…
          </span>
        )}
        <span className="board-summary-spacer" />
        {!archived && (
          <button type="button" className="text-button" onClick={() => setNewStatus('todo')}>
            <Plus size={16} />
            Nova tarefa
          </button>
        )}
      </div>
      <div className="kanban">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.data?.tasks.filter((task) => task.status === status) ?? [];
          return (
            <section
              key={status}
              className={`kanban-column ${overColumn === status ? 'drag-over' : ''}`}
              aria-label={taskStatusLabels[status]}
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
              <header className="column-header">
                <span className={`status-dot ${status}`} />
                <h2>{taskStatusLabels[status]}</h2>
                <span className="column-count">{columnTasks.length}</span>
                {!archived && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Adicionar tarefa em ${taskStatusLabels[status]}`}
                    onClick={() => setNewStatus(status)}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </header>
              <div className="column-body">
                {columnTasks.map((task, index) => (
                  <article
                    key={task.id}
                    className={`task-card ${task.status === 'done' ? 'task-done' : ''} ${draggedId === task.id ? 'dragging' : ''}`}
                    draggable={!action.busy}
                    onDragStart={(event) => {
                      setDraggedId(task.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', task.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setOverColumn(null);
                    }}
                    onDragOver={(event) => {
                      if (!draggedId || draggedId === task.id) return;
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      drop(status, task.id);
                    }}
                  >
                    <div className="task-card-top">
                      <button
                        type="button"
                        className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
                        disabled={action.busy}
                        onClick={() => void complete(task)}
                        aria-label={task.status === 'done' ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
                      >
                        {task.status === 'done' ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                      </button>
                      <button type="button" className="task-title" onClick={() => setSelectedId(task.id)}>
                        {task.title}
                      </button>
                      <ActionMenu
                        label={`Opções de ${task.title}`}
                        items={[
                          { label: 'Editar tarefa', action: () => setSelectedId(task.id) },
                          ...TASK_STATUSES.filter((s) => s !== status).map((s) => ({
                            label: `Mover para ${taskStatusLabels[s]}`,
                            action: () => void move(task, s),
                            icon: <ArrowRight size={14} />,
                          })),
                          {
                            label: 'Mover para cima',
                            icon: <ArrowUp size={14} />,
                            disabled: index === 0,
                            action: () => void move(task, status, columnTasks[index - 1]?.id ?? null),
                          },
                          {
                            label: 'Mover para baixo',
                            icon: <ArrowDown size={14} />,
                            disabled: index === columnTasks.length - 1,
                            action: () => void move(task, status, columnTasks[index + 2]?.id ?? null),
                          },
                        ]}
                      />
                    </div>
                    {task.source && (
                      <div className="task-card-meta">
                        <button type="button" className="source-chip" onClick={() => setSelectedId(task.id)}>
                          <FileText size={12} />
                          <span>{task.source.documentTitle}</span>
                        </button>
                      </div>
                    )}
                  </article>
                ))}
                {columnTasks.length === 0 && (
                  <div className="empty-column">
                    {status === 'todo'
                      ? 'Tudo começa com um pequeno passo.'
                      : status === 'doing'
                        ? 'O que merece sua atenção agora?'
                        : 'Cada conclusão conta.'}
                  </div>
                )}
                {!archived && (
                  <button type="button" className="column-add" onClick={() => setNewStatus(status)}>
                    <Plus size={15} />
                    Adicionar tarefa
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="board-hint">Arraste para organizar ou use o menu de cada tarefa.</p>
      <TaskDialog
        open={newStatus !== null}
        onClose={() => setNewStatus(null)}
        initialStatus={newStatus ?? 'todo'}
        initialProjectId={projectId}
      />
      <TaskDialog open={Boolean(selected)} onClose={() => setSelectedId(null)} task={selected} />
    </>
  );
}

export function LinkedTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const action = useAction();
  const request = useRequest();
  async function toggle() {
    const input = {
      id: task.id,
      expectedVersion: task.version,
      status: task.status === 'done' ? ('todo' as const) : ('done' as const),
    };
    await action.run(
      () => api.workspace.updateTask({ ...input, requestId: request.for(input) }),
      () => request.clear(),
    );
  }
  return (
    <div className={`linked-task ${task.status === 'done' ? 'is-done' : ''}`}>
      <button
        type="button"
        className="task-check"
        onClick={() => void toggle()}
        disabled={action.busy}
        aria-label={task.status === 'done' ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
      >
        {task.status === 'done' ? <CheckCircle2 size={17} /> : <Circle size={17} />}
      </button>
      <button type="button" className="linked-task-title" onClick={onOpen}>
        {task.title}
        <span>{taskStatusLabels[task.status]}</span>
      </button>
    </div>
  );
}
