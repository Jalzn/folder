import { AppError } from '@tinyfold/core/application';
import { type Column, firstOpenColumn } from '../domain/columns.js';
import type { TaskAck, TaskStatus } from '../domain/models.js';
import { excerptPresent } from '../domain/task-source.js';
import { columnOfStatus } from '../domain/task-status.js';
import { assertVersion, projectForEditedItem, requireActiveProject, requireDocument, requireTask } from './helpers.js';
import type { TaskRecord, TaskSourceRecord, WorkspaceContext, WorkspaceRepository } from './ports.js';
import type {
  CreateTaskInput,
  DeleteTaskInput,
  ListTasksInput,
  MoveTaskInput,
  RestoreTaskInput,
  UpdateTaskInput,
} from './schemas/tasks.js';

/** The answer of a task write, without its title (see TaskAck). */
const taskAck = (task: TaskRecord, revision: number): TaskAck => ({
  id: task.id,
  projectId: task.projectId,
  version: task.version,
  updatedAt: task.updatedAt,
  revision,
});

/**
 * The active column a write names: by its ID, or, until B6, by the status of stage 09 (see
 * columnOfStatus). Without either, `fallback`.
 */
async function columnFor(
  repo: WorkspaceRepository,
  input: { columnId?: string | undefined; status?: TaskStatus | undefined },
  fallback: (columns: Column[]) => Column | undefined,
): Promise<Column> {
  const columns = await repo.activeColumns();
  const id = input.columnId ?? (input.status ? columnOfStatus(columns, input.status) : fallback(columns)?.id);
  const column = columns.find((candidate) => candidate.id === id);
  if (!column) throw new AppError('NOT_FOUND', 'A coluna não está disponível.');
  return column;
}

/**
 * Where a task goes in a column of its project: the top of the done column, where the latest
 * completion shows, or the end of any other. Going to the top renumbers the column.
 */
async function placeIn(repo: WorkspaceRepository, projectId: string, column: Column, taskId: string) {
  if (!column.isDone) return repo.nextPosition(projectId, column.id);
  const others = (await repo.tasksInColumn(projectId, column.id)).filter((task) => task.id !== taskId);
  for (const [index, task] of others.entries())
    if (task.position !== index + 1) await repo.setTaskPosition(task.id, index + 1);
  return 0;
}

/** The completion a task has in `column`: kept while it stays done, now on entering, none outside it. */
const completionIn = (column: Column, task: Pick<TaskRecord, 'completedAt'> | undefined, now: string) =>
  column.isDone ? (task?.completedAt ?? now) : null;

export function listTasks(ctx: WorkspaceContext, input: ListTasksInput) {
  return ctx.read(async (repo) => ({ tasks: await repo.listTasks(input), revision: await repo.revision() }));
}

export function createTask(ctx: WorkspaceContext, input: CreateTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.createTask', input, async (repo) => {
    const id = ctx.newId();
    let projectId = input.projectId ?? undefined;
    let source: TaskSourceRecord | undefined;
    if (input.source) {
      const document = await requireDocument(repo, input.source.documentId);
      if (input.source.expectedVersion !== undefined) assertVersion(document.version, input.source.expectedVersion);
      // A task from an excerpt joins the document's project unless the input names another one.
      projectId ??= document.projectId;
      const blockId = input.source.blockId ?? null;
      if (!excerptPresent(document, blockId, input.source.excerpt))
        throw new AppError(
          'VERSION_CONFLICT',
          'O trecho de origem mudou. Salve o documento e selecione o trecho novamente.',
        );
      source = {
        taskId: id,
        documentId: document.id,
        documentTitle: document.title,
        blockId,
        excerpt: input.source.excerpt,
      };
    }
    // CreateTaskInput lets the project be missing only with a source, whose document has one.
    if (projectId === undefined) throw new AppError('VALIDATION', 'Escolha o projeto da tarefa.');
    const project = await requireActiveProject(repo, projectId);
    const column = await columnFor(repo, input, firstOpenColumn);
    const now = ctx.now();
    const task: TaskRecord = {
      id,
      title: input.title,
      projectId: project.id,
      columnId: column.id,
      position: await placeIn(repo, project.id, column, id),
      dueOn: null,
      completedAt: completionIn(column, undefined, now),
      description: [],
      descriptionPlainText: '',
      checklistDone: 0,
      checklistTotal: 0,
      version: 1,
      textVersion: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await repo.insertTask(task);
    if (source) await repo.insertSource(source);
    return taskAck(task, await repo.bumpRevision());
  });
}

export function updateTask(ctx: WorkspaceContext, input: UpdateTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.updateTask', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    const projectId = await projectForEditedItem(repo, task.projectId, input.projectId);
    const column = await columnFor(repo, input, (columns) => columns.find((item) => item.id === task.columnId));
    // Positions count within one project's column: a task joining another column or project goes to its end.
    const stays = column.id === task.columnId && projectId === task.projectId;
    const now = ctx.now();
    const saved: TaskRecord = {
      ...task,
      projectId,
      columnId: column.id,
      position: stays ? task.position : await placeIn(repo, projectId, column, task.id),
      completedAt: completionIn(column, task, now),
      version: task.version + 1,
      updatedAt: now,
    };
    await repo.saveTaskFields(saved, task.version);
    // Until B6, the interface of stage 09 renames a task here: a change of the text, with its version.
    if (input.title !== undefined && input.title !== task.title)
      await repo.saveTaskText({ ...saved, title: input.title, textVersion: task.textVersion + 1 }, task.textVersion);
    return taskAck(saved, await repo.bumpRevision());
  });
}

export function deleteTask(ctx: WorkspaceContext, input: DeleteTaskInput) {
  return ctx.write('workspace.deleteTask', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    const now = ctx.now();
    await repo.saveTaskFields({ ...task, deletedAt: now, updatedAt: now, version: task.version + 1 }, task.version);
    return { id: task.id, revision: await repo.bumpRevision() };
  });
}

/** Brings a task back from the trash, to the end of its column, which is always active. */
export function restoreTask(ctx: WorkspaceContext, input: RestoreTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.restoreTask', input, async (repo) => {
    const task = await repo.findTask(input.id);
    if (!task) throw new AppError('NOT_FOUND', 'A tarefa não foi encontrada.');
    assertVersion(task.version, input.expectedVersion);
    if (!task.deletedAt) throw new AppError('DOMAIN_RULE', 'A tarefa não está na lixeira.');
    const saved = {
      ...task,
      deletedAt: null,
      position: await repo.nextPosition(task.projectId, task.columnId),
      version: task.version + 1,
      updatedAt: ctx.now(),
    };
    await repo.saveTaskFields(saved, task.version);
    return taskAck(saved, await repo.bumpRevision());
  });
}

export function moveTask(ctx: WorkspaceContext, input: MoveTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.moveTask', input, async (repo) => {
    if ((await repo.revision()) !== input.expectedRevision) {
      throw new AppError('VERSION_CONFLICT', 'O quadro mudou em outro dispositivo. Atualize antes de mover a tarefa.');
    }
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    if (input.beforeTaskId === task.id) throw new AppError('VALIDATION', 'Escolha outra tarefa como referência.');
    const column = await columnFor(repo, input, () => undefined);
    // Boards are per project, so the column renumbered is the task's project's.
    const tasks = (await repo.tasksInColumn(task.projectId, column.id)).filter((item) => item.id !== task.id);
    const index = input.beforeTaskId ? tasks.findIndex((item) => item.id === input.beforeTaskId) : tasks.length;
    if (index < 0)
      throw new AppError('VERSION_CONFLICT', 'A posição escolhida não está mais disponível. Atualize o quadro.');
    tasks.splice(index, 0, task);
    const now = ctx.now();
    const moved = {
      ...task,
      columnId: column.id,
      position: tasks.indexOf(task),
      completedAt: completionIn(column, task.columnId === column.id ? task : undefined, now),
      updatedAt: now,
      version: task.version + 1,
    };
    for (const [place, item] of tasks.entries()) {
      if (item === task) await repo.saveTaskFields(moved, task.version);
      // A neighbour that only shifts is not edited: the board revision, not its version, orders moves.
      else if (item.position !== place) await repo.setTaskPosition(item.id, place);
    }
    return taskAck(moved, await repo.bumpRevision());
  });
}
