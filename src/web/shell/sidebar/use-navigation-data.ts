import { type NavigationSorts, useProjectNavigation } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { useSidebarPrefs } from './use-sidebar-prefs';

/** The sidebar's data for a project, in the order each section keeps on this device. */
export function useNavigationData(project: Project | null) {
  const prefs = useSidebarPrefs();
  const sorts: NavigationSorts = {
    documents: project ? prefs.section(project.id, 'documents').sort : 'recent',
    drawings: project ? prefs.section(project.id, 'drawings').sort : 'recent',
  };
  return useProjectNavigation(project?.id ?? null, sorts).data;
}

/** The exact number of items in a project's trash, which a trash listing may cut. */
export const useTrashCount = (project: Project | null) => useNavigationData(project)?.trashCount;
