import type { NavFolder, NavItem } from '@tinyfold/workspace/domain';
import { useEffect, useMemo } from 'react';
import { parseProjectPath } from '../../../router/paths';
import { useSidebarPrefs } from '../use-sidebar-prefs';

/** An item's place in the arrivals: "document:<id>". */
export const arrivalKey = (item: { type: string; id: string }) => `${item.type}:${item.id}`;

/**
 * Per project, the last page the tree took as an arrival: an item's key, or null for any other page. It
 * outlives the sidebar, which remounts when it goes to the rail and back or closes over the page, and the
 * rail's popover shares it: a remount is no arrival. A reload starts with the item on screen taken, since
 * reloading is none either.
 */
const arrivals = new Map<string, string | null>(
  (() => {
    const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== 'reload') return [];
    const place = parseProjectPath(window.location.pathname);
    return place?.item ? [[place.projectId, arrivalKey(place.item)] as const] : [];
  })(),
);

/**
 * Which folders of a project are open, kept on this device (docs/etapas/09-pastas.md, "Aberta ou fechada").
 * The first visit opens only the open item's folder; arriving at an item of a closed folder opens it, and
 * closing it afterwards holds until the next arrival, which a reload of the page is not. Unknown folders are
 * ignored, and dropped on the next write.
 */
export function useExpandedFolders(
  projectId: string,
  folders: readonly NavFolder[] | undefined,
  /** The item the address opens, as `arrivalKey`, or null on another page. */
  place: string | null,
  /** That item once its page has it, with its folder. */
  open: NavItem | null,
) {
  const prefs = useSidebarPrefs();
  const entry = prefs.project(projectId);
  const known = useMemo(() => (folders ? new Set(folders.map((folder) => folder.id)) : null), [folders]);
  const expanded = useMemo(
    () => new Set((entry?.expanded ?? []).filter((id) => !known || known.has(id))),
    [entry, known],
  );
  const keep = (ids: Iterable<string>) => [...new Set(ids)].filter((id) => !known || known.has(id));
  const write = (ids: Iterable<string>) => prefs.setProject(projectId, { expanded: keep(ids) });

  const waiting = place !== null && (open === null || arrivalKey(open) !== place);
  // biome-ignore lint/correctness/useExhaustiveDependencies: It runs on an arrival or a first visit, not on each toggle.
  useEffect(() => {
    // The item's folder is known once its page has it.
    if (!known || waiting) return;
    if (entry && arrivals.has(projectId) && arrivals.get(projectId) === place) return;
    arrivals.set(projectId, place);
    const folderId = open?.folderId && known.has(open.folderId) ? open.folderId : null;
    if (!entry) write(folderId ? [folderId] : []);
    else if (folderId && !expanded.has(folderId)) write([...expanded, folderId]);
  }, [known, place, waiting, projectId, entry === null]);

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
