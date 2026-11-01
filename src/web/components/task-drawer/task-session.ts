import { checklistProgress } from '@tinyfold/workspace/domain';
import { api, errorCode, queryClient, reportSessionError } from '../../lib/api';
import { AutosaveController, type SaveInput } from '../../lib/autosave';
import { draftStorage } from '../../lib/draft-storage';
import { type ProjectBoard, type TaskList, type TaskWithText, taskQuery } from '../../lib/queries';
import { registerSave } from '../../lib/save-registry';
import { refuseOverLimit } from '../../lib/text-limit';
import { displayTitle } from '../../lib/types';
import { parseTaskTextDraft, type TaskTextSnapshot } from './task-text-draft';

/**
 * The tab's text sessions, by installation and task: a task held by the drawer, or not saved yet. One leaves
 * once nothing holds it and its text is saved, so browsing the board card by card keeps no descriptions.
 */
const sessions = new Map<
  string,
  { controller: AutosaveController<TaskTextSnapshot>; unregister: () => void; holders: number }
>();
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
  const session = sessions.get(identity);
  if (session) return session.controller;
  const controller = new AutosaveController<TaskTextSnapshot>({
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
    },
    onAdopted: (snapshot, version) => showSaved(task, snapshot, version),
  });
  sessions.set(identity, { controller, unregister: registerSave('task', task.id, controller), holders: 0 });
  return controller;
}

/**
 * The drawer holds a task's session while it shows the task; the returned release lets the session go once
 * its text is saved, at once or when its pending save lands.
 */
export function holdTaskController(taskId: string, installationId: string) {
  const identity = identityOf(taskId, installationId);
  const session = sessions.get(identity);
  if (!session) return () => undefined;
  session.holders += 1;
  return () => {
    session.holders -= 1;
    const drop = () => {
      if (session.holders > 0 || sessions.get(identity) !== session) return true;
      if (session.controller.getState().status !== 'saved') return false;
      sessions.delete(identity);
      session.unregister();
      return true;
    };
    if (drop()) return;
    const stop = session.controller.subscribe(() => {
      if (drop()) stop();
    });
  };
}

export type TaskTextController = ReturnType<typeof taskController>;
