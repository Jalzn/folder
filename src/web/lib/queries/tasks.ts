import { useQuery } from '@tanstack/react-query';
import { api, queryClient } from '../api';
import { boardKey, type ProjectBoard } from './board';

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
 * what the board is now rather than what it was when the key was pressed: the board's or the project's list,
 * whichever was read last, as the drawer reads the list away from the board. With `taskId`, the freshest that
 * has that task: the board leaves out tasks completed before its 14 days.
 */
export function cachedTasks(projectId: string, taskId?: string): Pick<TaskList, 'tasks' | 'revision'> | undefined {
  const states = [
    queryClient.getQueryState<ProjectBoard>(boardKey(projectId)),
    queryClient.getQueryState<TaskList>(tasksKey({ projectId })),
  ].flatMap((state) => (state?.data ? [{ data: state.data, at: state.dataUpdatedAt }] : []));
  states.sort((a, b) => b.at - a.at);
  const fits = states.find((state) => !taskId || state.data.tasks.some((task) => task.id === taskId));
  return (fits ?? states[0])?.data;
}
