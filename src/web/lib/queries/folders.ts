import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';

/** The active folders of a project, in their order, with their item counts and versions. */
export const foldersQuery = (projectId: string) =>
  queryOptions({
    queryKey: ['workspace', 'folders', projectId] as const,
    queryFn: () => api.workspace.listFolders({ projectId }),
    select: (data) => data.folders,
  });

export function useFolders(projectId: string | null) {
  return useQuery({ ...foldersQuery(projectId ?? ''), enabled: projectId !== null });
}

export type FolderSummary = Awaited<ReturnType<typeof api.workspace.listFolders>>['folders'][number];
