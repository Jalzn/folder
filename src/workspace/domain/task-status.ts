import type { TaskStatus } from './models.js';

/** Board column order. */
export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done'];

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Concluído',
};
