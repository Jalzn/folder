import { NAV_SORTS, type NavSort } from '@tinyfold/workspace/domain';

/** One project's items on this device: their order and the folders left open. */
export interface ProjectPrefs {
  sort: NavSort;
  expanded: string[];
}

/** The sidebar on this device: `tinyfold:<installationId>:sidebar` (docs/etapas/09-pastas.md, decision 1). */
export interface SidebarPrefs {
  collapsed: boolean;
  projects: Record<string, ProjectPrefs>;
}

export const sidebarPrefsKey = (installationId: string) => `tinyfold:${installationId}:sidebar`;

export const defaultProjectPrefs: ProjectPrefs = { sort: 'recent', expanded: [] };

function readProject(value: unknown): ProjectPrefs | null {
  if (!value || typeof value !== 'object') return null;
  const { sort, expanded } = value as Record<string, unknown>;
  return {
    sort: NAV_SORTS.includes(sort as NavSort) ? (sort as NavSort) : defaultProjectPrefs.sort,
    expanded: Array.isArray(expanded) ? [...new Set(expanded.filter((id) => typeof id === 'string'))] : [],
  };
}

/**
 * Reads stored preferences tolerantly: anything invalid falls back to the defaults, and the per-section
 * format of stage 08 (`sections`) is dropped, so the order goes back to Recentes once.
 */
export function parseSidebarPrefs(raw: string | null): SidebarPrefs {
  let value: unknown = null;
  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
    // Broken preferences start over.
  }
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const projects: SidebarPrefs['projects'] = {};
  if (record.projects && typeof record.projects === 'object')
    for (const [projectId, entry] of Object.entries(record.projects)) {
      const prefs = readProject(entry);
      if (prefs) projects[projectId] = prefs;
    }
  return { collapsed: record.collapsed === true, projects };
}

/** A project's preferences, or null on the first visit to it from this device. */
export const projectPrefs = (prefs: SidebarPrefs, projectId: string): ProjectPrefs | null =>
  prefs.projects[projectId] ?? null;

export function withProject(prefs: SidebarPrefs, projectId: string, patch: Partial<ProjectPrefs>): SidebarPrefs {
  const current = projectPrefs(prefs, projectId) ?? defaultProjectPrefs;
  return { ...prefs, projects: { ...prefs.projects, [projectId]: { ...current, ...patch } } };
}
