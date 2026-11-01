import { useNavigate } from '@tanstack/react-router';
import { type Ref, type RefObject, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { type Key, Tree } from 'react-aria-components';
import type { Project } from '../../../lib/types';
import { paths } from '../../../router/paths';
import { focusPageTitle, focusWhenPresent } from '../../../ui';
import { useApp } from '../../AppProvider';
import { useAnnounce } from '../../announcer';
import { usePins } from '../../project/use-pins';
import { modifiedClick } from './ItemRow';
import { type Moving, TreeOverlays } from './TreeOverlays';
import { entryRow, rowIn } from './tree-dom';
import { treeNodes } from './tree-nodes';
import { type FolderNode, folderKey, type ItemNode, type TreeNode } from './tree-rows';
import type { useExpandedFolders } from './use-expanded-folders';
import { useRowAnchor } from './use-row-anchor';
import { useTabEntry } from './use-tab-entry';
import type { TreeEditing } from './use-tree-editing';
import { useTreeKeyRouter } from './use-tree-key-router';

/** What the tree lets the sidebar and the rail's popover do. */
export interface TreeHandle {
  /** Focuses the row the keyboard comes in at (entryRow); false without rows. */
  focusEntry: () => boolean;
}

/** How recently a pointer went down on an item's link, and with which modifiers. */
interface LinkPress {
  modified: boolean;
  at: number;
}

/**
 * The Itens tree (docs/interface/pastas.md §1 and §4), the `Tree` of React Aria: the root's pins, the folders
 * that open and close, and the loose items, with "Ver todos" and "Pasta vazia" rows. The sidebar and the
 * rail's popover show the same tree from the same rows and the same open folders; only the sidebar passes
 * `editing`, its folder actions and dragging. ↵ or a click opens an item or toggles a folder; the keys go
 * through use-tree-key-router.ts, and the rows come from tree-nodes.tsx.
 */
export function ItemsTree({
  project,
  rows,
  expanded,
  editing,
  treeRef,
  handleRef,
  onLeaveUp,
  onChoose,
}: {
  project: Project;
  rows: TreeNode[];
  expanded: ReturnType<typeof useExpandedFolders>;
  editing?: TreeEditing | undefined;
  treeRef?: RefObject<HTMLDivElement | null>;
  handleRef?: Ref<TreeHandle> | undefined;
  /** ↑ on the first row: back to the navigation above the tree. */
  onLeaveUp?: () => void;
  /** After an item opens from the tree, as a popover that closes. */
  onChoose?: (item: ItemNode) => void;
}) {
  const app = useApp();
  const navigate = useNavigate();
  const pins = usePins();
  const announce = useAnnounce();
  const ownRef = useRef<HTMLDivElement>(null);
  const tree = treeRef ?? ownRef;
  const rowByKey = (key: string | null) => rowIn(tree.current, key);
  const linkPress = useRef<LinkPress | null>(null);
  const [moving, setMoving] = useState<Moving | null>(null);
  const moveAnchor = useRowAnchor(tree, moving?.node.key ?? null);
  const newHereAnchor = useRowAnchor(tree, editing?.folders.newHere?.key ?? null);

  // "MCP aberta", "MCP recolhida": the live region says what a toggle did.
  const say = (folderId: string, opened: boolean) => {
    const folder = rows.find((row): row is FolderNode => row.key === folderKey(folderId));
    if (folder) announce(`${folder.folder.name} ${opened ? 'aberta' : 'recolhida'}`);
  };
  const setOpenFolders = (ids: string[]) => {
    const before = expanded.expanded;
    expanded.setExpanded(ids);
    const opened = ids.find((id) => !before.has(id));
    const closed = [...before].find((id) => !ids.includes(id));
    if (opened) say(opened, true);
    else if (closed) say(closed, false);
  };

  // The open item's row stays in view, as when a link or the search arrives at an item of a closed folder,
  // and says it is the page on screen, as its link does: React Aria's row takes no aria-current of its own,
  // so it is set on the element after every render that may redraw it.
  const currentKey = rows
    .flatMap((row) => (row.kind === 'folder' ? row.children : [row]))
    .find((row): row is ItemNode => row.kind === 'item' && row.current)?.key;
  useLayoutEffect(() => {
    if (currentKey) rowIn(tree.current, currentKey)?.scrollIntoView({ block: 'nearest' });
  }, [currentKey, tree]);
  useLayoutEffect(() => {
    for (const row of tree.current?.querySelectorAll('[role="row"][aria-current]') ?? [])
      if (row.getAttribute('data-key') !== currentKey) row.removeAttribute('aria-current');
    if (currentKey) rowByKey(currentKey)?.setAttribute('aria-current', 'page');
  });
  const tabEntry = useTabEntry(() => rowByKey(currentKey ?? null));
  useImperativeHandle(handleRef, () => ({
    focusEntry: () => {
      const row = entryRow(tree.current, currentKey ?? null);
      row?.focus();
      return Boolean(row);
    },
  }));

  const archived = Boolean(project.archivedAt);
  const keys = useTreeKeyRouter({
    tree,
    rows,
    editing,
    onLeaveUp,
    onPin: (node) => {
      const pinned = Boolean(node.item.pinnedAt);
      void (pinned ? pins.unpin(node.item.type, node.item.id) : pins.pin(node.item.type, node.item.id)).then(
        (done) => done && announce(pinned ? 'Desafixado.' : 'Fixado.'),
      );
    },
    onMove: (node, neighbour) => !archived && setMoving({ node, neighbour }),
  });
  const focusNeighbour = ({ neighbour }: Moving) => {
    const next = rowByKey(neighbour);
    if (next) next.focus();
    else focusPageTitle();
  };

  const rendered = treeNodes({
    project,
    rows,
    editing,
    navigate: (href) => void navigate({ href }),
    onOpen: (node) => {
      const press = linkPress.current;
      linkPress.current = null;
      // A ⌘-click or a middle click opens another tab through the link; the page stays.
      if (press && performance.now() - press.at < 1000 && press.modified) return;
      void navigate({ href: paths.item(project.id, node.item.type, node.item.id) });
      onChoose?.(node);
    },
    onLinkPress: (event) => {
      linkPress.current = { modified: modifiedClick(event) || event.button !== 0, at: event.timeStamp };
    },
    onToggle: (folderId) => {
      const opening = !expanded.isExpanded(folderId);
      expanded.toggle(folderId);
      say(folderId, opening);
    },
    onNew: (type, folderId) =>
      void (type === 'document' ? app.newDocument(project.id, folderId) : app.newCanvas(project.id, folderId)),
    onUnpin: editing ? (node) => void pins.unpin(node.item.type, node.item.id) : undefined,
  });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The keys and the focus only pass through, to the tree inside.
    <div
      className="items-tree"
      data-variant={editing ? 'sidebar' : 'popover'}
      onKeyDownCapture={keys.onKeyDownCapture}
      onKeyDown={keys.onKeyDown}
      onFocusCapture={tabEntry}
    >
      <Tree
        ref={tree}
        aria-label={`Itens de ${project.name}`}
        className="items-tree__tree"
        selectionMode="none"
        escapeKeyBehavior="none"
        {...(editing ? { dragAndDropHooks: editing.dragAndDropHooks } : {})}
        expandedKeys={new Set<Key>([...expanded.expanded].map(folderKey))}
        onExpandedChange={(keys) =>
          setOpenFolders(
            [...keys].flatMap((key) =>
              String(key).startsWith('folder:') ? [String(key).slice('folder:'.length)] : [],
            ),
          )
        }
        renderEmptyState={() => <p className="items-tree__empty">Nada aqui ainda.</p>}
      >
        {rendered}
      </Tree>
      <TreeOverlays
        project={project}
        editing={editing}
        moving={moving}
        moveAnchor={moveAnchor}
        newHereAnchor={newHereAnchor}
        onMoveClose={({ node }) => {
          // Closed without a move: back to the row, also where the menu leaves the focus on nothing, as
          // inside the sidebar over the page.
          setMoving(null);
          requestAnimationFrame(() => {
            const active = document.activeElement;
            if (!active || active === document.body) rowByKey(node.key)?.focus();
          });
        }}
        onMovedToFolder={(current, folderId) => {
          // The folder that receives an item opens, and the item keeps the focus in its new place.
          if (folderId) expanded.expand(folderId);
          focusWhenPresent(() => rowByKey(current.node.key), { fallback: () => focusNeighbour(current) });
        }}
        onMovedToProject={focusNeighbour}
      />
    </div>
  );
}
