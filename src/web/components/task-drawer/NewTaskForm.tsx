import { isOverdue } from '@tinyfold/workspace/domain';
import { Plus } from 'lucide-react';
import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { api, errorMessage, refreshWorkspace, reportSessionError } from '../../lib/api';
import { doneAndFirstOpen } from '../../lib/board-order';
import { useColumns, useLabels, useProjects } from '../../lib/queries';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { useOwnerToday } from '../../shell/AppProvider';
import { type DrawerContent, useTaskDrawer } from '../../shell/task-drawer-state';
import { AlertDialog, Button, useToast } from '../../ui';
import { useCreateLabel } from '../labels/use-create-label';
import { DueField } from './DueField';
import type { DrawerCommands } from './drawer-commands';
import { LabelsField } from './LabelsField';
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
  const createLabel = useCreateLabel(useAction());
  const projects = useProjects(true).data ?? [];
  const request = useRequest();
  const errorId = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const initialTitle = content.title ?? '';
  const columns = useColumns().data?.columns ?? [];
  const [title, setTitle] = useState(initialTitle);
  const [projectId, setProjectId] = useState(content.projectId);
  // Without a column of its own, the task goes to the first open one, as the server does.
  const [chosenColumn, setColumn] = useState(content.columnId);
  const columnId = chosenColumn ?? doneAndFirstOpen(columns).open?.id;
  const column = columns.find((each) => each.id === columnId);
  const today = useOwnerToday();
  const labels = useLabels().data ?? [];
  const [dueOn, setDue] = useState<string | null>(null);
  const [labelIds, setLabels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const project = projects.find((each) => each.id === projectId);
  const dirty =
    title !== initialTitle ||
    projectId !== content.projectId ||
    chosenColumn !== content.columnId ||
    dueOn !== null ||
    labelIds.length > 0;
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
    const input = {
      title: name,
      projectId,
      ...(chosenColumn ? { columnId: chosenColumn } : {}),
      ...(dueOn ? { dueOn } : {}),
      ...(labelIds.length ? { labelIds } : {}),
      ...(source ? { source } : {}),
    };
    setBusy(true);
    setError(null);
    try {
      const created = await api.workspace.createTask({ ...input, requestId: request.for(input) });
      request.clear();
      await refreshWorkspace();
      drawer.showTask({ id: created.id, projectId: created.projectId, title: name });
      toast(`Tarefa criada em ${column?.name ?? 'o quadro'} · ${project?.name ?? 'o projeto'}.`);
    } catch (failure) {
      reportSessionError(failure);
      setError(errorMessage(failure));
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }
  // ⌘↵ creates: the drawer holds one stable command, which calls this render's create.
  const latestCreate = useRef(create);
  latestCreate.current = create;
  useEffect(() => {
    const drawerCommands = commands.current;
    drawerCommands.primary = () => void latestCreate.current();
    return () => {
      drawerCommands.primary = undefined;
    };
  }, [commands]);
  /** A label made from the picker goes on the new task at once; the task itself waits for Criar. */
  async function addNewLabel(name: string) {
    const created = await createLabel(name);
    if (created) setLabels((current) => [...current, created]);
  }

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
            {
              id: 'column',
              label: 'Coluna',
              value: <ColumnField columnId={columnId} columns={columns} editable onChange={(id) => setColumn(id)} />,
            },
            {
              id: 'due',
              label: 'Prazo',
              value: (
                <DueField
                  due={dueOn}
                  today={today}
                  late={isOverdue(dueOn, today, Boolean(column?.isDone))}
                  editable
                  onChange={setDue}
                />
              ),
            },
            {
              id: 'labels',
              label: 'Etiquetas',
              value: (
                <LabelsField
                  labelIds={labelIds}
                  labels={labels}
                  editable
                  onChange={setLabels}
                  onCreate={(name) => void addNewLabel(name)}
                />
              ),
            },
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
