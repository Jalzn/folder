import { useQuery } from '@tanstack/react-query';
import type { NavSort } from '@tinyfold/workspace/domain';
import { api, queryClient } from '../api';

export interface NavigationSorts {
  documents: NavSort;
  drawings: NavSort;
}

/**
 * The sidebar of a project: each section's total, pinned items and first items (the server's default of
 * eight), open tasks and the trash.
 */
export function useProjectNavigation(projectId: string | null, sorts: NavigationSorts) {
  return useQuery({
    queryKey: ['workspace', 'navigation', projectId, sorts],
    queryFn: () =>
      api.workspace.projectNavigation({
        projectId: projectId ?? '',
        documentsSort: sorts.documents,
        drawingsSort: sorts.drawings,
      }),
    enabled: projectId !== null,
  });
}

/** A save may change a title or the order: the sidebar and the Visão geral read again. */
export function invalidateNavigation() {
  void queryClient.invalidateQueries({ queryKey: ['workspace', 'navigation'] });
  void queryClient.invalidateQueries({ queryKey: ['workspace', 'overview'] });
}
