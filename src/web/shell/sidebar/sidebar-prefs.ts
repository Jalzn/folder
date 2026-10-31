import { NAV_SORTS, type NavSort } from '@tinyfold/workspace/domain';

/** A sidebar section: Documentos or Desenhos, as projectNavigation names them. */
export type SectionKind = 'documents' | 'drawings';

export interface SectionPrefs {
  open: boolean;
  sort: NavSort;
}

/** The sidebar on this device: `tinyfold:<installationId>:sidebar`. */
export interface SidebarPrefs {
  collapsed: boolean;
  sections: Record<string, Partial<Record<SectionKind, SectionPrefs>>>;
}

export const sidebarPrefsKey = (installationId: string) => `tinyfold:${installationId}:sidebar`;

export const defaultSectionPrefs: SectionPrefs = { open: true, sort: 'recent' };

function readSection(value: unknown): SectionPrefs | null {
  if (!value || typeof value !== 'object') return null;
  const { open, sort } = value as Record<string, unknown>;
  return {
    open: typeof open === 'boolean' ? open : defaultSectionPrefs.open,
    sort: NAV_SORTS.includes(sort as NavSort) ? (sort as NavSort) : defaultSectionPrefs.sort,
  };
}

/** Reads stored preferences tolerantly: anything invalid falls back to the defaults. */
export function parseSidebarPrefs(raw: string | null): SidebarPrefs {
  let value: unknown = null;
  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
    // Broken preferences start over.
  }
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const sections: SidebarPrefs['sections'] = {};
  if (record.sections && typeof record.sections === 'object')
    for (const [projectId, entry] of Object.entries(record.sections)) {
      if (!entry || typeof entry !== 'object') continue;
      const documents = readSection((entry as Record<string, unknown>).documents);
      const drawings = readSection((entry as Record<string, unknown>).drawings);
      sections[projectId] = { ...(documents ? { documents } : {}), ...(drawings ? { drawings } : {}) };
    }
  return { collapsed: record.collapsed === true, sections };
}

export function sectionPrefs(prefs: SidebarPrefs, projectId: string, kind: SectionKind): SectionPrefs {
  return prefs.sections[projectId]?.[kind] ?? defaultSectionPrefs;
}

export function withSection(
  prefs: SidebarPrefs,
  projectId: string,
  kind: SectionKind,
  patch: Partial<SectionPrefs>,
): SidebarPrefs {
  const current = sectionPrefs(prefs, projectId, kind);
  return {
    ...prefs,
    sections: { ...prefs.sections, [projectId]: { ...prefs.sections[projectId], [kind]: { ...current, ...patch } } },
  };
}
