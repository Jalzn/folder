import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { NavTree } from '#workspace/domain';
import type { Project } from '../../../lib/types';
import { parseProjectPath } from '../../../navigation/paths';
import { useOpenItem } from '../use-open-item';
import { usePendingSaves } from '../use-pending-saves';
import { type PendingItem, treeRows } from './tree-rows';
import { arrivalKey, useExpandedFolders } from './use-expanded-folders';

/**
 * The rows of a project's Itens tree and its open folders, shared by the sidebar and the rail's popover. The
 * items with unsaved changes come from the save registry; their folder, from the tree or the open item's page.
 */
export function useItemsTree(project: Project, tree: NavTree | undefined) {
  const open = useOpenItem();
  const place = useLocation({
    select: (location) => {
      const item = parseProjectPath(location.pathname)?.item;
      return item ? arrivalKey(item) : null;
    },
  });
  const expanded = useExpandedFolders(project.id, tree?.folders, place, open);
  const saves = usePendingSaves();
  const pending = useMemo(() => {
    if (!tree) return [];
    const listed = [...tree.pinned, ...tree.loose.items, ...tree.folders.flatMap((folder) => folder.items)];
    if (open) listed.push(open);
    const found = new Map(listed.map((item) => [arrivalKey(item), item]));
    return [...saves].flatMap((key): PendingItem[] => {
      const item = found.get(key);
      return item ? [{ type: item.type, id: item.id, folderId: item.folderId }] : [];
    });
  }, [tree, open, saves]);
  const rows = useMemo(
    () => (tree ? treeRows(tree, open, expanded.expanded, pending) : []),
    [tree, open, expanded.expanded, pending],
  );
  return { rows, expanded, pending, total: tree?.total };
}
