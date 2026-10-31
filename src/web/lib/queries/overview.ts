import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export type ProjectOverview = Awaited<ReturnType<typeof api.workspace.projectOverview>>;

/** A project at a glance: open tasks, the tasks in progress, what they leave out and the items edited last. */
export function useProjectOverview(projectId: string) {
  return useQuery({
    queryKey: ['workspace', 'overview', projectId],
    queryFn: () => api.workspace.projectOverview({ projectId }),
  });
}
