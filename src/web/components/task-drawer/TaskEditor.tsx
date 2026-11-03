import { checklistProgress, isOverdue } from '@tinyfold/workspace/domain';
import { type RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAutosaveLifecycle } from '../../lib/autosave/use-autosave-lifecycle';
import { type ColumnSummary, type TaskWithText, useLabels } from '../../lib/queries';
import { useCommandSlot } from '../../lib/react/use-command-slot';
import { type Task, UNTITLED } from '../../lib/types';
import { paths } from '../../navigation/paths';
import { useApp, useOwnerToday } from '../../shell';
import { useTaskDrawer } from '../../shell/state';
import { Banner, useToast } from '../../ui';
import { ReloadDialog } from '../item-page/EditorDialogs';
import { SaveBanners } from '../item-page/SaveBanners';
import { SaveState } from '../item-page/SaveState';
import { TaskSource } from '../task/TaskSource';
import { TrashTaskDialog } from '../task/TrashTaskDialog';
import { ChecklistRow } from './ChecklistRow';
import { DueField } from './DueField';
import { type DrawerCommands, EMPTY_DRAWER_COMMANDS } from './drawer-commands';
import { LabelsField } from './LabelsField';
import { type DescriptionHandle, TaskDescription } from './TaskDescription';
import { TaskDrawerHeader } from './TaskDrawerHeader';
import { ColumnField, ProjectField, TaskProperties } from './TaskProperties';
import { TaskTitleField } from './TaskTitleField';
import { holdTaskController, taskController, taskTextSnapshot } from './task-session';
import { useTaskFields } from './use-task-fields';
import { useTaskTextActions } from './use-task-text-actions';

/**
 * An open task (docs/etapas/10-quadro-tarefa.md, "Gaveta da tarefa"): the header with the title, the save
 * state, Concluir and the ⋯; the bands of its text; the description beside the properties. The title and the
 * description save together by the text's autosave, which outlives the drawer; the fields write one at a time.
 * An archived project's task only reads.
 */
export function TaskEditor({
  task,
  detail,
  columns,
  editable,
  region,
  commands,
}: {
  task: Task;
  detail: TaskWithText;
  columns: readonly ColumnSummary[];
  editable: boolean;
  region: RefObject<HTMLElement | null>;
  commands: RefObject<DrawerCommands>;
}) {
  const app = useApp();
  const drawer = useTaskDrawer();
  const toast = useToast();
  const today = useOwnerToday();
  const labels = useLabels().data ?? [];
  const [controller] = useState(() => taskController(detail, app.owner.installationId));
  // The session stays while the drawer shows the task, and leaves once saved after that.
  useEffect(() => holdTaskController(task.id, app.owner.installationId), [task.id, app.owner.installationId]);
  useAutosaveLifecycle(controller);
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const fields = useTaskFields(task);
  const text = useTaskTextActions(controller, task);
  const description = useRef<DescriptionHandle>(null);
  const [trashing, setTrashing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  // A newer text saved elsewhere: taken in silence without local changes, a conflict with them.
  useEffect(() => {
    if (detail.textVersion > controller.getState().version)
      controller.receiveRemote(taskTextSnapshot(detail), detail.textVersion);
  }, [controller, detail]);
  const column = columns.find((each) => each.id === task.columnId);
  useCommandSlot(commands, { primary: editable ? () => void fields.toggleDone() : undefined }, EMPTY_DRAWER_COMMANDS);
  useCommandSlot(
    drawer.taskCommands,
    {
      done: Boolean(column?.isDone),
      copyLink: () => void copyLink(),
      ...(editable
        ? {
            toggleDone: () => void fields.toggleDone(),
            moveToColumn: () => setMoveOpen(true),
            trash: () => setTrashing(true),
          }
        : {}),
    },
    null,
  );
  const progress = checklistProgress(state.snapshot.description);
  const change = (patch: Partial<typeof state.snapshot>) =>
    controller.change({ ...controller.getState().snapshot, ...patch });
  async function copyLink() {
    const link = new URL(paths.task(task.projectId, task.id), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(link);
      toast('Link da tarefa copiado.');
    } catch {
      toast('Não foi possível copiar o link.', 'error');
    }
  }
  const title = state.snapshot.title === UNTITLED ? '' : state.snapshot.title;

  return (
    <>
      <TaskDrawerHeader
        columnId={task.columnId}
        columns={columns}
        editable={editable}
        title={
          <TaskTitleField
            drawer={region}
            value={title}
            label="Título da tarefa"
            placeholder={UNTITLED}
            readOnly={!editable}
            onChange={(value) => change({ title: value })}
            onEnter={() => description.current?.focusStart()}
            onLeave={() => region.current?.focus({ preventScroll: true })}
          />
        }
        moveOpen={moveOpen}
        onMoveOpenChange={setMoveOpen}
        saveState={<SaveState status={state.status} onRetry={() => void controller.flush()} />}
        onMove={(columnId, name) => void fields.setColumn(columnId, name)}
        onToggleDone={() => void fields.toggleDone()}
        onCopyLink={() => void copyLink()}
        onTrash={() => setTrashing(true)}
        onClose={() => drawer.close()}
      />
      <div className="task-drawer__body">
        <SaveBanners
          state={state}
          noun="Esta tarefa"
          projectId={task.projectId}
          canCopy={editable}
          copying={text.copying}
          onDownloadRecovery={text.downloadRecovery}
          onReload={() => setReloading(true)}
          onSaveCopy={() => void text.saveCopy()}
          onRetry={() => void controller.flush()}
          onExport={text.downloadRecovery}
          className="task-drawer__banners"
        >
          {!editable && <Banner tone="info">Projeto arquivado: desarquive para editar a tarefa.</Banner>}
        </SaveBanners>
        <div className="task-drawer__columns">
          <div className="task-drawer__text">
            <TaskDescription
              state={state}
              editable={editable}
              handle={description}
              drawer={region}
              onChange={(next) => change({ description: next })}
            />
          </div>
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
                id: 'due',
                label: 'Prazo',
                value: (
                  <DueField
                    due={task.dueOn}
                    today={today}
                    late={isOverdue(task.dueOn, today, Boolean(column?.isDone))}
                    editable={editable}
                    onChange={(dueOn) => void fields.setDue(dueOn)}
                  />
                ),
              },
              {
                id: 'labels',
                label: 'Etiquetas',
                value: (
                  <LabelsField
                    labelIds={task.labelIds}
                    labels={labels}
                    editable={editable}
                    onChange={(labelIds) => void fields.setLabels(labelIds)}
                    onCreate={(name) => void fields.addNewLabel(name)}
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
              ...(progress.total
                ? [
                    {
                      id: 'checklist',
                      label: 'Checklist',
                      value: <ChecklistRow done={progress.done} total={progress.total} />,
                    },
                  ]
                : []),
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
      </div>
      <TrashTaskDialog
        task={task}
        open={trashing}
        pending={fields.busy}
        onClose={() => setTrashing(false)}
        onConfirm={() => void fields.trash().then(() => setTrashing(false))}
      />
      <ReloadDialog
        open={reloading}
        onClose={() => setReloading(false)}
        onConfirm={() => void text.reloadRemote().then((loaded) => loaded && setReloading(false))}
      />
    </>
  );
}
