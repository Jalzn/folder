import type { Project } from '../lib/types';
import type { NavState } from './last-location';
import { paths } from './paths';

export interface StartLocation {
  path: string;
  /** The scroll position to restore once the content renders. */
  scrollTop: number;
}

/**
 * Where `/` opens (docs/etapas/08-fundacao.md, "Início"):
 * 1. the stored path of the last project, when it exists and is active;
 * 2. otherwise the Visão geral of the first active project of the switcher;
 * 3. without an active project, `/projetos`.
 * An archived last project is not reopened, so whoever archived everything lands on the empty state.
 */
export function resolveStartPath(state: NavState, projects: Project[]): StartLocation {
  const last = projects.find((project) => project.id === state.lastProjectId && !project.archivedAt);
  if (last) {
    const location = state.projects[last.id];
    return location
      ? { path: location.path, scrollTop: location.scrollTop }
      : { path: paths.overview(last.id), scrollTop: 0 };
  }
  const first = projects
    .filter((project) => !project.archivedAt)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))[0];
  return { path: first ? paths.overview(first.id) : paths.noProject, scrollTop: 0 };
}
