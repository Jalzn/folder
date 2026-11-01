import type { NavFolder, NavItem } from '@tinyfold/workspace/domain';
import { useEffect, useMemo, useRef } from 'react';
import { parseProjectPath } from '../../../router/paths';
import { useSidebarPrefs } from '../use-sidebar-prefs';

/** The item on screen when the page was reloaded, read as the app loads: its first showing is no arrival. */
let reloadedItem = (() => {
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type !== 'reload') return null;
  const item = parseProjectPath(window.location.pathname)?.item;
  return item ? `${item.type}:${item.id}` : null;
})();

/** Whether this arrival is only the reload of the page it was on; the first item shown settles it. */
function isReload(arrival: string | null) {
  if (arrival === null) return false;
  const reload = arrival === reloadedItem;
  reloadedItem = null;
  return reload;
}

/**
 * Which folders of a project are open, kept on this device (docs/etapas/09-pastas.md, "Aberta ou fechada").
 * The first visit opens only the open item's folder; arriving at an item of a closed folder opens it, and
 * closing it afterwards holds until the next arrival, which a reload of the page is not. Unknown folders are
 * ignored, and dropped on the next write.
 */
export function useExpandedFolders(projectId: string, folders: readonly NavFolder[] | undefined, open: NavItem | null) {
  const prefs = useSidebarPrefs();
  const entry = prefs.project(projectId);
  const known = useMemo(() => (folders ? new Set(folders.map((folder) => folder.id)) : null), [folders]);
  const expanded = useMemo(
    () => new Set((entry?.expanded ?? []).filter((id) => !known || known.has(id))),
    [entry, known],
  );
  const keep = (ids: Iterable<string>) => [...new Set(ids)].filter((id) => !known || known.has(id));
  const write = (ids: Iterable<string>) => prefs.setProject(projectId, { expanded: keep(ids) });

  const arrival = open ? `${open.type}:${open.id}` : null;
  const handled = useRef<string | null | undefined>(undefined);
  // biome-ignore lint/correctness/useExhaustiveDependencies: It runs on an arrival or a first visit, not on each toggle.
  useEffect(() => {
    if (!known) return;
    if (entry && handled.current === arrival) return;
    handled.current = arrival;
    // A reload is no arrival: the item on screen keeps the folders as they were left.
    if (entry && isReload(arrival)) return;
    const folderId = open?.folderId && known.has(open.folderId) ? open.folderId : null;
    if (!entry) write(folderId ? [folderId] : []);
    else if (folderId && !expanded.has(folderId)) write([...expanded, folderId]);
  }, [known, arrival, projectId, entry === null]);

  return {
    expanded,
    isExpanded: (id: string) => expanded.has(id),
    setExpanded: (ids: Iterable<string>) => write(ids),
    toggle: (id: string) => write(expanded.has(id) ? [...expanded].filter((open) => open !== id) : [...expanded, id]),
    /** Opens a folder, even one the tree does not list yet, as a folder the server just created. */
    expand: (id: string) => prefs.setProject(projectId, { expanded: [...new Set([...keep(expanded), id])] }),
    collapseAll: () => write([]),
  };
}
