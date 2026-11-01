import type { WorkspaceContext } from '../../application/ports.js';
import {
  CreateTaskInput,
  DeleteTaskInput,
  GetTaskInput,
  ListCompletedTasksInput,
  ListTasksInput,
  MoveTaskInput,
  ProjectBoardInput,
  RestoreTaskInput,
  SaveTaskTextInput,
  UpdateTaskInput,
} from '../../application/schemas/tasks.js';
import {
  createTask,
  deleteTask,
  getTask,
  listCompletedTasks,
  listTasks,
  moveTask,
  projectBoard,
  restoreTask,
  saveTaskText,
  updateTask,
} from '../../application/tasks/index.js';
import { operation } from './operation.js';

export const taskOperations = (ctx: WorkspaceContext) => ({
  listTasks: operation(ListTasksInput, (input) => listTasks(ctx, input)),
  getTask: operation(GetTaskInput, (input) => getTask(ctx, input)),
  projectBoard: operation(ProjectBoardInput, (input) => projectBoard(ctx, input)),
  listCompletedTasks: operation(ListCompletedTasksInput, (input) => listCompletedTasks(ctx, input)),
  createTask: operation(CreateTaskInput, (input) => createTask(ctx, input)),
  updateTask: operation(UpdateTaskInput, (input) => updateTask(ctx, input)),
  saveTaskText: operation(SaveTaskTextInput, (input) => saveTaskText(ctx, input)),
  deleteTask: operation(DeleteTaskInput, (input) => deleteTask(ctx, input)),
  restoreTask: operation(RestoreTaskInput, (input) => restoreTask(ctx, input)),
  moveTask: operation(MoveTaskInput, (input) => moveTask(ctx, input)),
});
