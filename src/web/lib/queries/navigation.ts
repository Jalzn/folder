import { useQuery } from '@tanstack/react-query';
import type { NavSort } from '@tinyfold/workspace/domain';
import { api, queryClient } from '../api';

/**
 * The sidebar of a project: the Itens tree (the root's pins, the folders and the loose items, each level up
 * to the server's default of eight in `sort` order), the open tasks and the trash count.
 */
export function useProjectNavigation(projectId: string | null, sort: NavSort) {
  return useQuery({
    queryKey: ['workspace', 'navigation', projectId, sort],
    queryFn: () => api.workspace.projectNavigation({ projectId: projectId ?? '', sort }),
    enabled: projectId !== null,
  });
}

/** A save may change a title or the order: the sidebar and the Visão geral read again. */
export function invalidateNavigation() {
  void queryClient.invalidateQueries({ queryKey: ['workspace', 'navigation'] });
  void queryClient.invalidateQueries({ queryKey: ['workspace', 'overview'] });
}
