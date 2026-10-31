import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export interface TaskListOptions {
  projectId?: string;
  documentId?: string;
}

export function useTasks(options: TaskListOptions = {}) {
  return useQuery({ queryKey: ['workspace', 'tasks', options], queryFn: () => api.workspace.listTasks(options) });
}
