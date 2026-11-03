import { isOverdue } from '@tinyfold/board/domain';
import { checklistProgress } from '@tinyfold/rich-text/domain';
import { type RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAutosaveLifecycle } from '../../lib/autosave/use-autosave-lifecycle';
import { type ColumnSummary, type TaskWithText, useLabels } from '../../lib/queries';
import { editableTitle, type Task, UNTITLED } from '../../lib/types';
import { useApp, useOwnerToday } from '../../shell';
import { useTaskDrawer } from '../../shell/state';
import { Banner } from '../../ui';
import { ReloadDialog, SaveBanners, SaveState } from '../item-page';
import { TaskSource, TrashTaskDialog } from '../task';
import { ChecklistRow } from './ChecklistRow';
import type { DrawerCommands } from './drawer-commands';
import { type DescriptionHandle, TaskDescription } from './TaskDescription';
import { TaskDrawerHeader } from './TaskDrawerHeader';
import { TaskProperties } from './TaskProperties';
import { TaskTitleField } from './TaskTitleField';
import { columnRow, dueRow, labelsRow, projectRow } from './task-property-rows';
import { holdTaskController, taskController, taskTextSnapshot } from './task-session';
import { useTaskEditorCommands } from './use-task-editor-commands';
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
  const { copyLink } = useTaskEditorCommands({
    commands,
    task,
    editable,
    done: Boolean(column?.isDone),
    toggleDone: fields.toggleDone,
    move: () => setMoveOpen(true),
    trash: () => setTrashing(true),
  });
  const progress = checklistProgress(state.snapshot.description);
  const change = (patch: Partial<typeof state.snapshot>) =>
    controller.change({ ...controller.getState().snapshot, ...patch });
  const title = editableTitle(state.snapshot.title);

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
              columnRow({
                columnId: task.columnId,
                columns: columns,
                editable: editable,
                onChange: (columnId, name) => void fields.setColumn(columnId, name),
              }),
              dueRow({
                due: task.dueOn,
                today: today,
                late: isOverdue(task.dueOn, today, Boolean(column?.isDone)),
                editable: editable,
                onChange: (dueOn) => void fields.setDue(dueOn),
              }),
              labelsRow({
                labelIds: task.labelIds,
                labels: labels,
                editable: editable,
                onChange: (labelIds) => void fields.setLabels(labelIds),
                onCreate: (name) => void fields.addNewLabel(name),
              }),
              projectRow({
                projectId: task.projectId,
                editable: editable,
                onChange: (projectId, name) => void fields.setProject(projectId, name),
              }),
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
