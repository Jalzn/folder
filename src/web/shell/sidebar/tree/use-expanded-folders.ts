import type { NavFolder, NavItem } from '@tinyfold/workspace/domain';
import { useEffect, useMemo, useRef } from 'react';
import { useSidebarPrefs } from '../use-sidebar-prefs';

/**
 * Which folders of a project are open, kept on this device (docs/etapas/09-pastas.md, "Aberta ou fechada").
 * The first visit opens only the open item's folder; arriving at an item of a closed folder opens it, and
 * closing it afterwards holds until the next arrival. Unknown folders are ignored, and dropped on the next
 * write.
 */
export function useExpandedFolders(projectId: string, folders: readonly NavFolder[] | undefined, open: NavItem | null) {
  const prefs = useSidebarPrefs();
  const entry = prefs.project(projectId);
  const known = useMemo(() => (folders ? new Set(folders.map((folder) => folder.id)) : null), [folders]);
  const expanded = useMemo(
    () => new Set((entry?.expanded ?? []).filter((id) => !known || known.has(id))),
    [entry, known],
  );
  const write = (ids: Iterable<string>) =>
    prefs.setProject(projectId, { expanded: [...new Set(ids)].filter((id) => !known || known.has(id)) });

  const arrival = open ? `${open.type}:${open.id}` : null;
  const handled = useRef<string | null | undefined>(undefined);
  // biome-ignore lint/correctness/useExhaustiveDependencies: It runs on an arrival or a first visit, not on each toggle.
  useEffect(() => {
    if (!known) return;
    if (entry && handled.current === arrival) return;
    handled.current = arrival;
    const folderId = open?.folderId && known.has(open.folderId) ? open.folderId : null;
    if (!entry) write(folderId ? [folderId] : []);
    else if (folderId && !expanded.has(folderId)) write([...expanded, folderId]);
  }, [known, arrival, projectId, entry === null]);

  return {
    expanded,
    isExpanded: (id: string) => expanded.has(id),
    setExpanded: (ids: Iterable<string>) => write(ids),
    toggle: (id: string) => write(expanded.has(id) ? [...expanded].filter((open) => open !== id) : [...expanded, id]),
    expand: (id: string) => write([...expanded, id]),
    collapseAll: () => write([]),
  };
}
