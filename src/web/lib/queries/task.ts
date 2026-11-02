import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { keys } from './keys';

/** A task with its description, as the drawer opens it; it reads tasks in the trash too. */
export const taskQuery = (id: string) =>
  queryOptions({ queryKey: keys.task(id), queryFn: () => api.workspace.getTask({ id }) });

export function useTask(id: string) {
  return useQuery(taskQuery(id));
}

export type TaskWithText = Awaited<ReturnType<typeof api.workspace.getTask>>;
