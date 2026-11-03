import { X } from 'lucide-react';
import { type RefObject, useEffect } from 'react';
import { useColumns, useProject, useTask, useTasks } from '../../lib/queries';
import { displayTitle } from '../../lib/types';
import { KEYS } from '../../shell/keyboard';
import { type DrawerContent, useTaskDrawer } from '../../shell/state';
import { IconButton, Spinner } from '../../ui';
import { TrashedItem } from '../item-page';
import type { DrawerCommands } from './drawer-commands';
import { TaskEditor } from './TaskEditor';

/**
 * The drawer's task: its editor once the task and its text have arrived, or why it does not show, as a task
 * gone from the project or moved to the trash elsewhere while open.
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
  const tasks = useTasks({ projectId: content.projectId });
  const detail = useTask(content.id);
  // A task that just moved to another project is in its text's answer before the new project's list has it:
  // the editor stays, with its focus, until the list catches up.
  const moved = detail.data && !detail.data.deletedAt && detail.data.projectId === content.projectId;
  const task = tasks.data?.tasks.find((each) => each.id === content.id) ?? (moved ? detail.data : undefined);
  const columns = useColumns().data?.columns;
  const project = useProject(content.projectId);
  const editable = Boolean(project && !project.archivedAt);
  const shown = displayTitle(task?.title ?? content.title);
  useEffect(() => onLabel(`Tarefa: ${shown}`), [onLabel, shown]);
  useEffect(() => {
    if (!task) commands.current.primary = undefined;
  });

  if (task && detail.data && columns)
    return (
      <TaskEditor
        key={task.id}
        task={task}
        detail={detail.data}
        columns={columns}
        editable={editable}
        region={region}
        commands={commands}
      />
    );
  const trashed = Boolean(detail.data?.deletedAt);
  const waiting = tasks.isPending || detail.isPending || !columns;
  return (
    <>
      <header className="task-drawer__head">
        <h2 className="task-drawer__title task-drawer__title--static">{shown}</h2>
        <div className="task-drawer__actions">
          <IconButton label="Fechar a gaveta" shortcut={KEYS.close} onPress={() => drawer.close()}>
            <X size={16} />
          </IconButton>
        </div>
      </header>
      <div className="task-drawer__body task-drawer__missing">
        {trashed ? (
          <TrashedItem
            title="Esta tarefa está na lixeira."
            description="Restaure a tarefa pela lixeira para voltar a editá-la."
            projectId={content.projectId}
          />
        ) : waiting && !detail.error ? (
          <Spinner />
        ) : (
          <p>Esta tarefa não está mais neste projeto.</p>
        )}
      </div>
    </>
  );
}
