import type { NavItem, NavTree } from '@tinyfold/workspace/domain';
import { useMemo } from 'react';
import type { Project } from '../../../lib/types';
import { useOpenItem } from '../use-open-item';
import { usePendingSaves } from '../use-pending-saves';
import { type PendingItem, treeRows } from './tree-rows';
import { useExpandedFolders } from './use-expanded-folders';

const keyOf = (item: Pick<NavItem, 'type' | 'id'>) => `${item.type}:${item.id}`;

/**
 * The rows of a project's Itens tree and its open folders, shared by the sidebar and the rail's popover. The
 * items with unsaved changes come from the save registry; their folder, from the tree or the open item's page.
 */
export function useItemsTree(project: Project, tree: NavTree | undefined) {
  const open = useOpenItem();
  const expanded = useExpandedFolders(project.id, tree?.folders, open);
  const saves = usePendingSaves();
  const pending = useMemo(() => {
    if (!tree) return [];
    const listed = [...tree.pinned, ...tree.loose.items, ...tree.folders.flatMap((folder) => folder.items)];
    if (open) listed.push(open);
    const found = new Map(listed.map((item) => [keyOf(item), item]));
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
