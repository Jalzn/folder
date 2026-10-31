import { AppError } from '@tinyfold/core/application';
import { excerptPresent } from '../domain/task-source.js';
import { assertVersion, projectForEditedItem, projectForNewItem, requireDocument, requireTask } from './helpers.js';
import type { TaskRecord, TaskSourceRecord, WorkspaceContext } from './ports.js';
import type {
  CreateTaskInput,
  DeleteTaskInput,
  ListTasksInput,
  MoveTaskInput,
  UpdateTaskInput,
} from './schemas/tasks.js';

export function listTasks(ctx: WorkspaceContext, input: ListTasksInput) {
  const { projectId, ...query } = input;
  return ctx.read(async (repo) => ({
    // Only the interface from before every item had a project filters by null; nothing matches.
    tasks: projectId === null ? [] : await repo.listTasks({ ...query, projectId }),
    revision: await repo.revision(),
  }));
}

export function createTask(ctx: WorkspaceContext, input: CreateTaskInput) {
  return ctx.write('workspace.createTask', input, async (repo) => {
    const id = ctx.newId();
    let projectId = input.projectId ?? null;
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
    const project = await projectForNewItem(repo, projectId);
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
    const revision = await repo.bumpRevision();
    return { task: await repo.taskView(id), revision };
  });
}

export function updateTask(ctx: WorkspaceContext, input: UpdateTaskInput) {
  return ctx.write('workspace.updateTask', input, async (repo) => {
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    const projectId = await projectForEditedItem(repo, task.projectId, input.projectId);
    const status = input.status ?? task.status;
    await repo.saveTask(
      {
        ...task,
        title: input.title ?? task.title,
        projectId,
        status,
        position: status === task.status ? task.position : await repo.nextPosition(status),
        version: task.version + 1,
        updatedAt: ctx.now(),
      },
      task.version,
    );
    const revision = await repo.bumpRevision();
    return { task: await repo.taskView(task.id), revision };
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

export function moveTask(ctx: WorkspaceContext, input: MoveTaskInput) {
  return ctx.write('workspace.moveTask', input, async (repo) => {
    if ((await repo.revision()) !== input.expectedRevision) {
      throw new AppError('VERSION_CONFLICT', 'O quadro mudou em outro dispositivo. Atualize antes de mover a tarefa.');
    }
    const task = await requireTask(repo, input.id);
    assertVersion(task.version, input.expectedVersion);
    if (input.beforeTaskId === task.id) throw new AppError('VALIDATION', 'Escolha outra tarefa como referência.');
    const column = (await repo.tasksInColumn(input.status)).filter((item) => item.id !== task.id);
    const index = input.beforeTaskId ? column.findIndex((item) => item.id === input.beforeTaskId) : column.length;
    if (index < 0)
      throw new AppError('VERSION_CONFLICT', 'A posição escolhida não está mais disponível. Atualize o quadro.');
    column.splice(index, 0, task);
    const now = ctx.now();
    for (const [position, item] of column.entries()) {
      if (item.id === task.id || item.position !== position || item.status !== input.status) {
        await repo.saveTask(
          { ...item, status: input.status, position, updatedAt: now, version: item.version + 1 },
          item.version,
        );
      }
    }
    return { task: await repo.taskView(task.id), revision: await repo.bumpRevision() };
  });
}
