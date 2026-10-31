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

/** One project, archived or not, from the list the shell already holds; undefined while it loads or when gone. */
export function useProject(id: string) {
  return useProjects(true).data?.find((project) => project.id === id);
}

/** Whether any project is active, which a copy or an import needs. */
export function useHasActiveProject() {
  return (useProjects(true).data ?? []).some((project) => !project.archivedAt);
}
