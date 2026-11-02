import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { keys } from './keys';

/** The active folders of a project, in their order, with their item counts and versions. */
export const foldersQuery = (projectId: string) =>
  queryOptions({
    queryKey: keys.folders(projectId),
    queryFn: () => api.workspace.listFolders({ projectId }),
    select: (data) => data.folders,
  });

export function useFolders(projectId: string | null) {
  return useQuery({ ...foldersQuery(projectId ?? ''), enabled: projectId !== null });
}

/** Every project's active folders, for ⌘K's Pastas. */
export function useAllFolders(enabled = true) {
  return useQuery({
    queryKey: keys.folders('all'),
    queryFn: () => api.workspace.listFolders({}),
    select: (data) => data.folders,
    enabled,
  });
}

export type FolderSummary = Awaited<ReturnType<typeof api.workspace.listFolders>>['folders'][number];
