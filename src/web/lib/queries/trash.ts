import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export type TrashItem = Awaited<ReturnType<typeof api.workspace.listTrash>>['items'][number];

/** A project's trash: documents, drawings and tasks, the most recently deleted first. */
export function useTrash(projectId: string) {
  return useQuery({
    queryKey: ['workspace', 'trash', projectId],
    queryFn: () => api.workspace.listTrash({ projectId }),
  });
}
