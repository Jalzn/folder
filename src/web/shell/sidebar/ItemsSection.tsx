import './tree/tree.css';
import type { NavTree } from '@tinyfold/workspace/domain';
import type { RefObject } from 'react';
import type { Project } from '../../lib/types';
import { useMoveToFolder } from '../folders/use-move-to-folder';
import { ItemsHeader } from './ItemsHeader';
import { defaultProjectPrefs } from './sidebar-prefs';
import { ItemsTree } from './tree/ItemsTree';
import { useItemsTree } from './tree/use-items-tree';
import { useTreeEditing } from './tree/use-tree-editing';
import { useSidebarPrefs } from './use-sidebar-prefs';

/** Itens in the sidebar: the header, with the order and "+", over the project's tree. */
export function ItemsSection({
  project,
  tree,
  treeRef,
  onLeaveUp,
}: {
  project: Project;
  tree: NavTree | undefined;
  treeRef: RefObject<HTMLDivElement | null>;
  onLeaveUp: () => void;
}) {
  const prefs = useSidebarPrefs();
  const items = useItemsTree(project, tree);
  const editing = useTreeEditing({ project, rows: items.rows, expanded: items.expanded, tree: treeRef });
  const moveToFolder = useMoveToFolder();
  const sort = (prefs.project(project.id) ?? defaultProjectPrefs).sort;
  return (
    <section className="items-section" aria-label="Itens">
      <ItemsHeader
        project={project}
        total={items.total}
        sort={sort}
        hasFolders={Boolean(tree?.folders.length)}
        onSort={(next) => prefs.setProject(project.id, { sort: next })}
        onCollapseAll={items.expanded.collapseAll}
        onDropToRoot={project.archivedAt ? undefined : (item) => void moveToFolder.move(item, null)}
      />
      {tree && (
        <ItemsTree
          project={project}
          rows={items.rows}
          expanded={items.expanded}
          editing={editing}
          treeRef={treeRef}
          onLeaveUp={onLeaveUp}
        />
      )}
    </section>
  );
}
