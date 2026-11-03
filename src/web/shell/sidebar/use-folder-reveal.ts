import { type RefObject, useEffect } from 'react';
import { focusWhenPresent } from '../../ui';
import { useSidebarRequests } from '../shell-ui';
import { rowIn } from './tree/tree-dom';
import { folderKey } from './tree/tree-rows';
import { useSidebarPrefs } from './use-sidebar-prefs';

/** How many frames a folder may take to show in the tree, as when another project's data is on its way. */
const FRAMES = 120;

/** Its first child once the folder is open, or the folder when it has none, once the folder's row is there. */
const focusFirstChild = (tree: RefObject<HTMLElement | null>, folderId: string) =>
  focusWhenPresent(
    () => {
      const folder = rowIn(tree.current, folderKey(folderId));
      const next = folder?.nextElementSibling;
      return next instanceof HTMLElement && next.getAttribute('aria-level') === '2' ? next : folder;
    },
    { frames: FRAMES },
  );

/**
 * Opening a folder from elsewhere: the sidebar's filter and ⌘K's Pastas. The folder opens in the tree, the
 * filter clears, and its first child takes the focus. A folder ⌘K asks for (`folderReveal`) is shown by the
 * sidebar of its project, once, even when that sidebar mounts after the request.
 */
export function useFolderReveal(
  projectId: string | null,
  tree: RefObject<HTMLElement | null>,
  clearFilter: () => void,
) {
  const ui = useSidebarRequests();
  const prefs = useSidebarPrefs();
  function openFolder(folderId: string) {
    if (!projectId) return;
    const expanded = prefs.project(projectId)?.expanded ?? [];
    prefs.setProject(projectId, { expanded: [...new Set([...expanded, folderId])] });
    clearFilter();
    focusFirstChild(tree, folderId);
  }
  const reveal = ui.folderReveal;
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new request, or the project it waits for, shows it.
  useEffect(() => {
    if (!reveal || reveal.projectId !== projectId) return;
    ui.revealFolder(null);
    openFolder(reveal.folderId);
  }, [reveal, projectId]);
  return openFolder;
}
