import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';

/** A task with its description, as the drawer opens it; it reads tasks in the trash too. */
export const taskQuery = (id: string) =>
  queryOptions({ queryKey: ['workspace', 'task', id] as const, queryFn: () => api.workspace.getTask({ id }) });

export function useTask(id: string) {
  return useQuery(taskQuery(id));
}

export type TaskWithText = Awaited<ReturnType<typeof api.workspace.getTask>>;
