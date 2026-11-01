import { type RefObject, useEffect, useState } from 'react';
import { useColumns, useProject, useTasks } from '../../lib/queries';
import type { Task } from '../../lib/types';
import { paths } from '../../router/paths';
import { type DrawerContent, useTaskDrawer } from '../../shell/task-drawer-state';
import { Banner, useToast } from '../../ui';
import { TaskSource } from '../task/TaskSource';
import { TrashTaskDialog } from '../task/TrashTaskDialog';
import type { DrawerCommands } from './drawer-commands';
import { TaskDrawerHeader } from './TaskDrawerHeader';
import { ColumnField, ProjectField, TaskProperties } from './TaskProperties';
import { TaskTitleField } from './TaskTitleField';
import { useTaskFields } from './use-task-fields';

/**
 * A task in the drawer: its header with the title, and its properties with the origin. The title saves on
 * ↵ or when it leaves; an empty one goes back to the saved title. An archived project's task only reads.
 */
export function OpenTask({
  content,
  region,
  commands,
  onLabel,
}: {
  content: Extract<DrawerContent, { mode: 'task' }>;
  region: RefObject<HTMLElement | null>;
  commands: RefObject<DrawerCommands>;
  onLabel: (label: string) => void;
}) {
  const drawer = useTaskDrawer();
  const toast = useToast();
  const tasks = useTasks({ projectId: content.projectId });
  const task = tasks.data?.tasks.find((each) => each.id === content.id);
  const project = useProject(content.projectId);
  const columns = useColumns().data?.columns ?? [];
  const editable = Boolean(project && !project.archivedAt);
  const fields = useTaskFields(task);
  const [trashing, setTrashing] = useState(false);
  const shown = task?.title ?? content.title;
  useEffect(() => onLabel(`Tarefa: ${shown}`), [onLabel, shown]);
  useEffect(() => {
    commands.current.primary = editable && task ? () => void fields.toggleDone() : undefined;
  });

  if (!task) {
    return (
      <div className="task-drawer__body task-drawer__missing">
        {tasks.isPending ? null : <p>Esta tarefa não está mais neste projeto.</p>}
      </div>
    );
  }
  async function copyLink(current: Task) {
    const link = new URL(paths.task(current.projectId, current.id), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(link);
      toast('Link da tarefa copiado.');
    } catch {
      toast('Não foi possível copiar o link.', 'error');
    }
  }
  return (
    <>
      <TaskDrawerHeader
        columnId={task.columnId}
        columns={columns}
        editable={editable}
        title={<TitleOf task={task} editable={editable} region={region} onRename={fields.rename} />}
        onMove={(columnId, name) => void fields.setColumn(columnId, name)}
        onToggleDone={() => void fields.toggleDone()}
        onCopyLink={() => void copyLink(task)}
        onTrash={() => setTrashing(true)}
        onClose={() => drawer.close()}
      />
      <div className="task-drawer__body">
        {!editable && <Banner tone="info">Projeto arquivado: desarquive para editar a tarefa.</Banner>}
        <TaskProperties
          label="Propriedades da tarefa"
          rows={[
            {
              id: 'column',
              label: 'Coluna',
              value: (
                <ColumnField
                  columnId={task.columnId}
                  columns={columns}
                  editable={editable}
                  onChange={(columnId, name) => void fields.setColumn(columnId, name)}
                />
              ),
            },
            {
              id: 'project',
              label: 'Projeto',
              value: (
                <ProjectField
                  projectId={task.projectId}
                  editable={editable}
                  onChange={(projectId, name) => void fields.setProject(projectId, name)}
                />
              ),
            },
          ]}
        >
          {task.source && (
            <TaskSource
              excerpt={task.source.excerpt}
              source={task.source}
              projectId={task.projectId}
              onLeave={() => {}}
            />
          )}
        </TaskProperties>
      </div>
      <TrashTaskDialog
        task={task}
        open={trashing}
        pending={fields.busy}
        onClose={() => setTrashing(false)}
        onConfirm={() => void fields.trash().then(() => setTrashing(false))}
      />
    </>
  );
}

/** The title being edited: it saves when it changes, on ↵ or when the field leaves. */
function TitleOf({
  task,
  editable,
  region,
  onRename,
}: {
  task: Task;
  editable: boolean;
  region: RefObject<HTMLElement | null>;
  onRename: (title: string) => unknown;
}) {
  const [draft, setDraft] = useState(task.title);
  const [editing, setEditing] = useState(false);
  // A title saved elsewhere shows while the field is not being edited.
  useEffect(() => {
    if (!editing) setDraft(task.title);
  }, [editing, task.title]);
  function commit() {
    setEditing(false);
    const title = draft.trim();
    if (!title) {
      setDraft(task.title);
      return;
    }
    if (title !== task.title) void onRename(title);
  }
  return (
    <TaskTitleField
      drawer={region}
      value={draft}
      label="Título da tarefa"
      readOnly={!editable}
      onChange={(value) => {
        setEditing(true);
        setDraft(value);
      }}
      onEnter={() => region.current?.focus({ preventScroll: true })}
      onLeave={() => region.current?.focus({ preventScroll: true })}
      onBlur={commit}
    />
  );
}
