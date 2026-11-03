import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { api, errorMessage, refreshWorkspace } from '../../lib/api';
import { openEditor } from '../../lib/autosave/save-registry';
import { doneAndFirstOpen } from '../../lib/board-order';
import { useColumns, useLabels, useProjects } from '../../lib/queries';
import { useCommandSlot } from '../../lib/react/use-command-slot';
import { useStableHandlers } from '../../lib/react/use-stable-handlers';
import { useRequest } from '../../lib/writes/use-request';
import { useOwnerToday } from '../../shell';
import { type DrawerContent, useTaskDrawer } from '../../shell/state';
import { useAction } from '../../shell/writes';
import { useToast } from '../../ui';
import { useCreateLabel } from '../labels/use-create-label';
import { type DrawerCommands, EMPTY_DRAWER_COMMANDS } from './drawer-commands';

import { useNewTaskGuard } from './use-new-task-guard';
export function useNewTaskDraft(
  content: Extract<DrawerContent, { mode: 'new' }>,
  commands: RefObject<DrawerCommands>,
  onLabel: (label: string) => void,
) {
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
  // "Incorporar no documento" (docs/etapas/11-documento-desenho.md, decision 15): only while the excerpt's
  // document is open in this tab, whose editor puts the card in; checked to begin with.
  const sourceDocument = content.source?.documentId;
  const embedHost = () => (sourceDocument ? openEditor('document', sourceDocument)?.insertEmbedAfter : undefined);
  const canEmbed = Boolean(content.embedAfter && embedHost());
  const [embed, setEmbed] = useState(true);
  const dirty =
    title !== initialTitle ||
    projectId !== content.projectId ||
    chosenColumn !== content.columnId ||
    dueOn !== null ||
    labelIds.length > 0;
  useEffect(() => onLabel('Nova tarefa'), [onLabel]);
  useNewTaskGuard(dirty, () => setDiscarding(true));

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
      content.onCreated?.({ id: created.id, projectId: created.projectId });
      // The document may have closed meanwhile: then the task stays without its card.
      const insert = canEmbed && embed && content.embedAfter ? embedHost() : undefined;
      const embedded = Boolean(insert && content.embedAfter && insert(content.embedAfter, created.id));
      toast(
        embedded
          ? 'Tarefa criada. O card entrou abaixo do parágrafo.'
          : `Tarefa criada em ${column?.name ?? 'o quadro'} · ${project?.name ?? 'o projeto'}.`,
      );
    } catch (failure) {
      setError(errorMessage(failure));
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }
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
