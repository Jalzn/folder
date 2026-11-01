import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';

export type TrashItem = Awaited<ReturnType<typeof api.workspace.listTrash>>['items'][number];

export const trashQuery = (projectId: string) =>
  queryOptions({
    queryKey: ['workspace', 'trash', projectId] as const,
    queryFn: () => api.workspace.listTrash({ projectId }),
  });

/** A project's trash: documents, drawings and tasks, the most recently deleted first. */
export function useTrash(projectId: string) {
  return useQuery(trashQuery(projectId));
}
