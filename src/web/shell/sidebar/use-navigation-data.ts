import { useProjectNavigation } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { defaultProjectPrefs } from './sidebar-prefs';
import { useSidebarPrefs } from './use-sidebar-prefs';

/** The sidebar's data for a project, its items in the order chosen on this device. */
export function useNavigationData(project: Project | null) {
  const prefs = useSidebarPrefs();
  const sort = project ? (prefs.project(project.id) ?? defaultProjectPrefs).sort : defaultProjectPrefs.sort;
  return useProjectNavigation(project?.id ?? null, sort).data;
}

/** The exact number of items in a project's trash, which a trash listing may cut. */
export const useTrashCount = (project: Project | null) => useNavigationData(project)?.trashCount;
