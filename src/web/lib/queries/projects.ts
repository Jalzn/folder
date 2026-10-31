import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export const projectsQuery = (includeArchived = false) => ({
  queryKey: ['workspace', 'projects', includeArchived] as const,
  queryFn: () => api.workspace.listProjects({ includeArchived }),
});

/** Active projects in switcher order, then, with `includeArchived`, the archived ones. */
export function useProjects(includeArchived = false) {
  return useQuery(projectsQuery(includeArchived));
}
