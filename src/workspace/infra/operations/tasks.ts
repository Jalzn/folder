import type { WorkspaceContext } from '../../application/ports.js';
import {
  CreateTaskInput,
  DeleteTaskInput,
  GetTaskInput,
  ListTasksInput,
  MoveTaskInput,
  RestoreTaskInput,
  SaveTaskTextInput,
  UpdateTaskInput,
} from '../../application/schemas/tasks.js';
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  moveTask,
  restoreTask,
  saveTaskText,
  updateTask,
} from '../../application/tasks/index.js';
import { operation } from './operation.js';

export const taskOperations = (ctx: WorkspaceContext) => ({
  listTasks: operation(ListTasksInput, (input) => listTasks(ctx, input)),
  getTask: operation(GetTaskInput, (input) => getTask(ctx, input)),
  createTask: operation(CreateTaskInput, (input) => createTask(ctx, input)),
  updateTask: operation(UpdateTaskInput, (input) => updateTask(ctx, input)),
  saveTaskText: operation(SaveTaskTextInput, (input) => saveTaskText(ctx, input)),
  deleteTask: operation(DeleteTaskInput, (input) => deleteTask(ctx, input)),
  restoreTask: operation(RestoreTaskInput, (input) => restoreTask(ctx, input)),
  moveTask: operation(MoveTaskInput, (input) => moveTask(ctx, input)),
});
