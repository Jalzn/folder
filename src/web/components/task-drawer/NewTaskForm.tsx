import { isOverdue } from '@tinyfold/workspace/domain';
import { Plus } from 'lucide-react';
import type { RefObject } from 'react';
import type { DrawerContent } from '../../shell/state';
import { AlertDialog, Button } from '../../ui';
import type { DrawerCommands } from './drawer-commands';
import { TaskProperties } from './TaskProperties';
import { TaskTitleField } from './TaskTitleField';
import { columnRow, dueRow, labelsRow, projectRow } from './task-property-rows';
import { useNewTaskDraft } from './use-new-task-draft';

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
  const {
    drawer,
    errorId,
    field,
    title,
    setTitle,
    projectId,
    setProjectId,
    columnId,
    setColumn,
    columns,
    today,
    labels,
    dueOn,
    setDue,
    labelIds,
    setLabels,
    busy,
    error,
    setError,
    discarding,
    setDiscarding,
    project,
    column,
    canEmbed,
    embed,
    setEmbed,
    create,
    addNewLabel,
  } = useNewTaskDraft(content, commands, onLabel);

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
          {canEmbed && (
            <label className="task-drawer__embed">
              <input type="checkbox" checked={embed} onChange={(event) => setEmbed(event.target.checked)} />
              Incorporar no documento
            </label>
          )}
        </div>
        <TaskProperties
          label="Propriedades da nova tarefa"
          rows={[
            projectRow({ projectId: projectId, editable: true, onChange: (id) => setProjectId(id) }),
            columnRow({ columnId: columnId, columns: columns, editable: true, onChange: (id) => setColumn(id) }),
            dueRow({
              due: dueOn,
              today: today,
              late: isOverdue(dueOn, today, Boolean(column?.isDone)),
              editable: true,
              onChange: setDue,
            }),
            labelsRow({
              labelIds: labelIds,
              labels: labels,
              editable: true,
              onChange: setLabels,
              onCreate: (name) => void addNewLabel(name),
            }),
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
