import { Plus } from 'lucide-react';
import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { api, errorMessage, refreshWorkspace, reportSessionError } from '../../lib/api';
import { useProjects } from '../../lib/queries';
import { type TaskStatus, taskStatusLabels } from '../../lib/types';
import { useRequest } from '../../lib/use-request';
import { type DrawerContent, useTaskDrawer } from '../../shell/task-drawer-state';
import { AlertDialog, Button, useToast } from '../../ui';
import type { DrawerCommands } from './drawer-commands';
import { ColumnField, ProjectField, TaskProperties } from './TaskProperties';
import { TaskTitleField } from './TaskTitleField';

/**
 * A new task in the drawer (docs/etapas/10-quadro-tarefa.md, "Tarefa nova"): the title in focus, Cancelar and
 * Criar, its project and column. ↵ in the title or ⌘↵ creates it, and the drawer passes to it; leaving with
 * something typed asks first. A retry after a lost answer reuses the request, so the task is created once.
 */
export function NewTaskForm({
  content,
  region,
  commands,
  onLabel,
}: {
  content: Extract<DrawerContent, { mode: 'new' }>;
  region: RefObject<HTMLElement | null>;
  commands: RefObject<DrawerCommands>;
  onLabel: (label: string) => void;
}) {
  const drawer = useTaskDrawer();
  const toast = useToast();
  const projects = useProjects(true).data ?? [];
  const request = useRequest();
  const errorId = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const initialTitle = content.title ?? '';
  const initialStatus = content.status ?? 'todo';
  const [title, setTitle] = useState(initialTitle);
  const [projectId, setProjectId] = useState(content.projectId);
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const project = projects.find((each) => each.id === projectId);
  const dirty = title !== initialTitle || projectId !== content.projectId || status !== initialStatus;
  const latestDirty = useRef(dirty);
  latestDirty.current = dirty;

  useEffect(() => onLabel('Nova tarefa'), [onLabel]);
  // Leaving with something typed asks first.
  useEffect(() => {
    drawer.setCloseGuard(() => {
      if (!latestDirty.current) return true;
      setDiscarding(true);
      return false;
    });
    return () => drawer.setCloseGuard(null);
  }, [drawer]);

  async function create() {
    if (busy) return;
    const name = title.trim();
    if (!name) {
      setError('Dê um título à tarefa.');
      field.current?.focus();
      return;
    }
    const source = content.source && {
      documentId: content.source.documentId,
      excerpt: content.source.excerpt,
      ...(content.source.blockId === undefined ? {} : { blockId: content.source.blockId }),
      ...(content.source.expectedVersion === undefined ? {} : { expectedVersion: content.source.expectedVersion }),
    };
    const input = { title: name, projectId, status, ...(source ? { source } : {}) };
    setBusy(true);
    setError(null);
    try {
      const created = await api.workspace.createTask({ ...input, requestId: request.for(input) });
      request.clear();
      await refreshWorkspace();
      drawer.showTask({ id: created.id, projectId: created.projectId, title: name });
      toast(`Tarefa criada em ${taskStatusLabels[status]} · ${project?.name ?? 'o projeto'}.`);
    } catch (failure) {
      reportSessionError(failure);
      setError(errorMessage(failure));
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    commands.current.primary = () => void create();
  });

  return (
    <form
      className="task-drawer__form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void create();
      }}
    >
      <header className="task-drawer__head">
        <span className="task-drawer__state" aria-hidden="true">
          <Plus size={16} />
        </span>
        <TaskTitleField
          field={field}
          drawer={region}
          value={title}
          label="Título da nova tarefa"
          placeholder="Nova tarefa"
          autoFocus
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
          onChange={(value) => {
            setTitle(value);
            setError(null);
          }}
          onEnter={() => void create()}
          onLeave={() => region.current?.focus({ preventScroll: true })}
        />
        <div className="task-drawer__actions">
          <Button variant="ghost" onPress={() => drawer.close()}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isPending={busy}>
            Criar
          </Button>
        </div>
      </header>
      <div className="task-drawer__body">
        <div className="task-drawer__intro">
          {error && (
            <p id={errorId} className="task-drawer__error" role="alert">
              {error}
            </p>
          )}
          <p>↵ cria a tarefa em {project?.name ?? 'o projeto'}. A descrição fica para depois de criar.</p>
          {content.source && (
            <p className="task-drawer__origin">
              Origem:{' '}
              <span className="task-drawer__origin-name">{content.source.documentTitle ?? content.source.excerpt}</span>
            </p>
          )}
        </div>
        <TaskProperties
          label="Propriedades da nova tarefa"
          rows={[
            {
              id: 'project',
              label: 'Projeto',
              value: <ProjectField projectId={projectId} editable onChange={(id) => setProjectId(id)} />,
            },
            { id: 'column', label: 'Coluna', value: <ColumnField status={status} editable onChange={setStatus} /> },
          ]}
        />
      </div>
      <AlertDialog
        open={discarding}
        title="Descartar a nova tarefa?"
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onClose={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false);
          drawer.close({ force: true });
        }}
      >
        <p>O que você digitou nesta tarefa não foi salvo.</p>
      </AlertDialog>
    </form>
  );
}
