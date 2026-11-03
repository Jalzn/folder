import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { doneAndFirstOpen } from '../../lib/board-order';
import { useColumns, useLabels, useProjects } from '../../lib/queries';
import { useCommandSlot } from '../../lib/react/use-command-slot';
import { useStableHandlers } from '../../lib/react/use-stable-handlers';
import { useOwnerToday } from '../../shell';
import { type DrawerContent, useTaskDrawer } from '../../shell/state';
import { useAction } from '../../shell/writes';
import { useCreateLabel } from '../labels';
import { type DrawerCommands, EMPTY_DRAWER_COMMANDS } from './drawer-commands';
import { useNewTaskGuard } from './use-new-task-guard';
import { useTaskCreation } from './use-task-creation';
export function useNewTaskDraft(
  content: Extract<DrawerContent, { mode: 'new' }>,
  commands: RefObject<DrawerCommands>,
  onLabel: (label: string) => void,
) {
  const drawer = useTaskDrawer();
  const createLabel = useCreateLabel(useAction());
  const projects = useProjects(true).data ?? [];
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
  const [discarding, setDiscarding] = useState(false);
  const project = projects.find((each) => each.id === projectId);
  const dirty =
    title !== initialTitle ||
    projectId !== content.projectId ||
    chosenColumn !== content.columnId ||
    dueOn !== null ||
    labelIds.length > 0;
  useEffect(() => onLabel('Nova tarefa'), [onLabel]);
  useNewTaskGuard(dirty, () => setDiscarding(true));

  const { create, busy, error, setError, canEmbed, embed, setEmbed } = useTaskCreation({
    content,
    draft: { title, projectId, chosenColumn, dueOn, labelIds },
    columnName: column?.name,
    projectName: project?.name,
    field,
  });
  const primary = useStableHandlers<DrawerCommands>({ primary: () => void create() });
  useCommandSlot(commands, primary, EMPTY_DRAWER_COMMANDS);
  /** A label made from the picker goes on the new task at once; the task itself waits for Criar. */
  async function addNewLabel(name: string) {
    const created = await createLabel(name);
    if (created) setLabels((current) => [...current, created]);
  }

  return {
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
  };
}
