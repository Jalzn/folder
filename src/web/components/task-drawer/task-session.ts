import { checklistProgress } from '@tinyfold/workspace/domain';
import { api, errorCode, queryClient, reportSessionError } from '../../lib/api';
import { AutosaveController, type SaveInput } from '../../lib/autosave';
import { draftStorage } from '../../lib/draft-storage';
import { embedsKey, type ProjectBoard, type TaskList, type TaskWithText, taskQuery } from '../../lib/queries';
import { registerSave } from '../../lib/save-registry';
import { createSessionPool } from '../../lib/session-pool';
import { refuseOverLimit } from '../../lib/text-limit';
import { displayTitle } from '../../lib/types';
import { parseTaskTextDraft, type TaskTextSnapshot } from './task-text-draft';

/**
 * The tab's text sessions, by installation and task: a task held by the drawer, or not saved yet. One leaves
 * once nothing holds it and its text is saved, so browsing the board card by card keeps no descriptions.
 */
const sessions = createSessionPool<AutosaveController<TaskTextSnapshot>>({
  register: (id, controller) => registerSave('task', id, controller),
  events: () => ({ window, document }),
});
const identityOf = (taskId: string, installationId: string) => `${installationId}:task:${taskId}`;

export const taskTextSnapshot = (task: TaskWithText): TaskTextSnapshot => ({
  title: task.title,
  description: task.description,
});

async function send(input: SaveInput<TaskTextSnapshot>) {
  // A description has the document's limit (decision 8).
  refuseOverLimit(input.description, 'Esta descrição ultrapassou o limite de 1 MB. Divida o texto em mais tarefas.');
  try {
    const saved = await api.workspace.saveTaskText({
      requestId: input.requestId,
      id: input.id,
      expectedTextVersion: input.expectedVersion,
      title: input.title,
      description: input.description,
    });
    return { id: saved.id, version: saved.textVersion, updatedAt: saved.updatedAt };
  } catch (error) {
    reportSessionError(error);
    throw error;
  }
}

/** What a saved text changes in the lists: the card's title and its checklist's progress. */
function showSaved(task: TaskWithText, text: TaskTextSnapshot, textVersion: number) {
  const title = displayTitle(text.title.trim());
  const progress = checklistProgress(text.description);
  const checklist = progress.total ? progress : null;
  queryClient.setQueryData(taskQuery(task.id).queryKey, (previous) =>
    previous && previous.textVersion > textVersion
      ? previous
      : { ...(previous ?? task), title, description: text.description, textVersion },
  );
  const update = <T extends Pick<TaskList, 'tasks'>>(list: T | undefined) =>
    list && {
      ...list,
      tasks: list.tasks.map((each) =>
        each.id === task.id && each.textVersion <= textVersion ? { ...each, title, checklist, textVersion } : each,
      ),
    };
  queryClient.setQueriesData<TaskList>({ queryKey: ['workspace', 'tasks'] }, update);
  queryClient.setQueriesData<ProjectBoard>({ queryKey: ['workspace', 'board'] }, update);
}

/**
 * A task's text autosave (docs/etapas/10-quadro-tarefa.md, "Descrição"): one controller per installation and
 * task for the life of the tab, so closing the drawer or opening another task never stops a save. It keeps
 * its draft in this device, registers in the save registry for the "não salvo" dot and the warning before
 * leaving, and saves the title and the description together at the text's version.
 */
export function taskController(task: TaskWithText, installationId: string) {
  const identity = identityOf(task.id, installationId);
  return sessions.controllerOf(
    identity,
    task.id,
    () =>
      new AutosaveController<TaskTextSnapshot>({
        id: task.id,
        snapshot: taskTextSnapshot(task),
        version: task.textVersion,
        storage: draftStorage(identity),
        readDraft: parseTaskTextDraft,
        idFactory: () => crypto.randomUUID(),
        classifyError: errorCode,
        send,
        onSaved: (ack, sent) => {
          showSaved(task, sent, ack.version);
          void queryClient.invalidateQueries({ queryKey: ['workspace', 'search'] });
          // A document that embeds the task shows its new title.
          void queryClient.invalidateQueries({ queryKey: embedsKey });
        },
        onAdopted: (snapshot, version) => showSaved(task, snapshot, version),
      }),
  );
}

/**
 * The drawer holds a task's session while it shows the task; the returned release lets the session go once
 * its text is saved, and until then keeps retrying when the network comes back and warning before leaving.
 */
export const holdTaskController = (taskId: string, installationId: string) =>
  sessions.hold(identityOf(taskId, installationId));

export type TaskTextController = ReturnType<typeof taskController>;
