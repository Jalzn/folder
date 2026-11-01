import { useQuery } from '@tanstack/react-query';
import { api, queryClient } from '../api';

export interface TaskListOptions {
  projectId?: string;
  documentId?: string;
}

export type TaskList = Awaited<ReturnType<typeof api.workspace.listTasks>>;

export const tasksKey = (options: TaskListOptions = {}) => ['workspace', 'tasks', options] as const;

export function useTasks(options: TaskListOptions = {}) {
  return useQuery({ queryKey: tasksKey(options), queryFn: () => api.workspace.listTasks(options) });
}

/**
 * A project's tasks and the board's revision as last read, for a write that runs from a queue and must send
 * what the board is now rather than what it was when the key was pressed.
 */
export const cachedTasks = (projectId: string) => queryClient.getQueryData<TaskList>(tasksKey({ projectId }));
