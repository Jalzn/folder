import type { WorkspaceContext } from '../../application/ports.js';
import {
  CreateTaskInput,
  DeleteTaskInput,
  ListTasksInput,
  MoveTaskInput,
  UpdateTaskInput,
} from '../../application/schemas/tasks.js';
import { createTask, deleteTask, listTasks, moveTask, updateTask } from '../../application/tasks.js';
import { operation } from './operation.js';

export const taskOperations = (ctx: WorkspaceContext) => ({
  listTasks: operation(ListTasksInput, (input) => listTasks(ctx, input)),
  createTask: operation(CreateTaskInput, (input) => createTask(ctx, input)),
  updateTask: operation(UpdateTaskInput, (input) => updateTask(ctx, input)),
  deleteTask: operation(DeleteTaskInput, (input) => deleteTask(ctx, input)),
  moveTask: operation(MoveTaskInput, (input) => moveTask(ctx, input)),
});
