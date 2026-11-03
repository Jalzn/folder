import { toIsoInstant } from '@tinyfold/core/domain';
import { parseProjectPath } from './paths';

/**
 * The last place of each project on this device (docs/etapas/08-fundacao.md, "Última localização"), kept in
 * localStorage['tinyfold:<installationId>:nav'] and read tolerantly: anything invalid is dropped.
 */
export interface NavState {
  version: 1;
  lastProjectId: string | null;
  projects: Record<string, ProjectLocation>;
}
export interface ProjectLocation {
  path: string;
  scrollTop: number;
  at: string;
}

export const navStorageKey = (installationId: string) => `tinyfold:${installationId}:nav`;

export const emptyNavState = (): NavState => ({ version: 1, lastProjectId: null, projects: {} });

/** Whether a stored path is an address inside that project. */
function belongsToProject(path: string, projectId: string) {
  return parseProjectPath(path)?.projectId === projectId;
}

function readLocation(projectId: string, value: unknown): ProjectLocation | null {
  if (!value || typeof value !== 'object') return null;
  const { path, scrollTop, at } = value as Record<string, unknown>;
  if (typeof path !== 'string' || !belongsToProject(path, projectId)) return null;
  return {
    path,
    scrollTop: typeof scrollTop === 'number' && Number.isFinite(scrollTop) && scrollTop > 0 ? Math.round(scrollTop) : 0,
    at: typeof at === 'string' ? at : toIsoInstant(new Date(0)),
  };
}

export function parseNavState(raw: string | null): NavState {
  if (!raw) return emptyNavState();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyNavState();
  }
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) return emptyNavState();
  const { lastProjectId, projects } = value as Record<string, unknown>;
  const locations: Record<string, ProjectLocation> = {};
  if (projects && typeof projects === 'object')
    for (const [projectId, entry] of Object.entries(projects)) {
      const location = readLocation(projectId, entry);
      if (location) locations[projectId] = location;
    }
  return { version: 1, lastProjectId: typeof lastProjectId === 'string' ? lastProjectId : null, projects: locations };
}

/** A navigation inside a project: it becomes the last project, and a new path starts at the top. */
export function recordPath(state: NavState, projectId: string, path: string, at: string): NavState {
  if (!belongsToProject(path, projectId)) return state;
  const previous = state.projects[projectId];
  const scrollTop = previous?.path === path ? previous.scrollTop : 0;
  return {
    ...state,
    lastProjectId: projectId,
    projects: { ...state.projects, [projectId]: { path, scrollTop, at } },
  };
}

/** The scroll position of the page the project shows now; ignored for any other path. */
export function recordScroll(state: NavState, projectId: string, path: string, scrollTop: number): NavState {
  const current = state.projects[projectId];
  if (!current || current.path !== path) return state;
  const top = Math.max(0, Math.round(scrollTop));
  if (top === current.scrollTop) return state;
  return { ...state, projects: { ...state.projects, [projectId]: { ...current, scrollTop: top } } };
}
