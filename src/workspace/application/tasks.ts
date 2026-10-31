import { AppError } from '@tinyfold/core/application';
import type { TaskAck } from '../domain/models.js';
import { excerptPresent } from '../domain/task-source.js';
import { assertVersion, projectForEditedItem, requireActiveProject, requireDocument, requireTask } from './helpers.js';
import type { TaskRecord, TaskSourceRecord, WorkspaceContext } from './ports.js';
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
    const now = ctx.now();
    const status = input.status ?? 'todo';
    const task: TaskRecord = {
      id,
      title: input.title,
      projectId: project.id,
      status,
      position: await repo.nextPosition(status),
      version: 1,
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
    const status = input.status ?? task.status;
    // Positions count within one project's column: a task joining another column or project goes to its end.
    const stays = status === task.status && projectId === task.projectId;
    const saved = {
      ...task,
      title: input.title ?? task.title,
      projectId,
      status,
      position: stays ? task.position : await repo.nextPosition(status),
      version: task.version + 1,
      updatedAt: ctx.now(),
    };
    await repo.saveTask(saved, task.version);
    return taskAck(saved, await repo.bumpRevision());
  });
}

export function deleteTask(ctx: WorkspaceContext, input: DeleteTaskInput) {
  return ctx.write('workspace.deleteTask', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    const now = ctx.now();
    await repo.saveTask({ ...task, deletedAt: now, updatedAt: now, version: task.version + 1 }, task.version);
    return { id: task.id, revision: await repo.bumpRevision() };
  });
}

/** Brings a task back from the trash, to the end of its column. */
export function restoreTask(ctx: WorkspaceContext, input: RestoreTaskInput): Promise<TaskAck> {
  return ctx.write('workspace.restoreTask', input, async (repo) => {
    const task = await repo.findTask(input.id);
    if (!task) throw new AppError('NOT_FOUND', 'A tarefa não foi encontrada.');
    assertVersion(task.version, input.expectedVersion);
    if (!task.deletedAt) throw new AppError('DOMAIN_RULE', 'A tarefa não está na lixeira.');
    const saved = {
      ...task,
      deletedAt: null,
      position: await repo.nextPosition(task.status),
      version: task.version + 1,
      updatedAt: ctx.now(),
    };
    await repo.saveTask(saved, task.version);
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
    // Boards are per project, so the column renumbered is the task's project's.
    const column = (await repo.tasksInColumn(input.status, task.projectId)).filter((item) => item.id !== task.id);
    const index = input.beforeTaskId ? column.findIndex((item) => item.id === input.beforeTaskId) : column.length;
    if (index < 0)
      throw new AppError('VERSION_CONFLICT', 'A posição escolhida não está mais disponível. Atualize o quadro.');
    column.splice(index, 0, task);
    const position = column.indexOf(task);
    const moved = { ...task, status: input.status, position, updatedAt: ctx.now(), version: task.version + 1 };
    for (const [place, item] of column.entries()) {
      if (item === task) await repo.saveTask(moved, task.version);
      // A neighbour that only shifts is not edited: the board revision, not its version, orders moves.
      else if (item.position !== place) await repo.setTaskPosition(item.id, place);
    }
    return taskAck(moved, await repo.bumpRevision());
  });
}
