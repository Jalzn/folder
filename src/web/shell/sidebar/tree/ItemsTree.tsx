import { useNavigate } from '@tanstack/react-router';
import { type KeyboardEvent, type ReactElement, type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { type Key, Tree, TreeItem, TreeItemContent } from 'react-aria-components';
import { cx } from '../../../lib/cx';
import type { Project } from '../../../lib/types';
import { paths } from '../../../router/paths';
import { focusPageTitle } from '../../../ui';
import { useApp } from '../../AppProvider';
import { chordPending, forwardToShortcuts } from '../../keyboard/use-shortcuts';
import { MoveToProjectMenu } from '../../project/MoveToProjectMenu';
import { usePins } from '../../project/use-pins';
import { useShellUi } from '../../shell-ui';
import { EmptyFolderRow } from './EmptyFolderRow';
import { FolderRow } from './FolderRow';
import { ItemRow, modifiedClick } from './ItemRow';
import { MoreRow } from './MoreRow';
import { rowKind, treeKeyAction } from './tree-keys';
import { folderLabel, itemLabel, moreLabel } from './tree-labels';
import { type FolderNode, folderKey, type ItemNode, type TreeNode } from './tree-rows';
import type { useExpandedFolders } from './use-expanded-folders';

type Expanded = ReturnType<typeof useExpandedFolders>;

/** How recently a pointer went down on an item's link, and with which modifiers. */
interface LinkPress {
  modified: boolean;
  at: number;
}

const rowOf = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>('[role="row"]') : null;

/**
 * The Itens tree (docs/interface/pastas.md §1 and §4), the `Tree` of React Aria: the root's pins, the folders
 * that open and close, and the loose items, with "Ver todos" and "Pasta vazia" rows. The sidebar and the
 * rail's popover show the same tree from the same rows and the same open folders. ↵ or a click opens an item
 * or toggles a folder; N, G, `/` and `?` go to the shortcuts, and P and M act on the item in focus.
 */
export function ItemsTree({
  project,
  rows,
  expanded,
  variant,
  treeRef,
  onLeaveUp,
  onChoose,
}: {
  project: Project;
  rows: TreeNode[];
  expanded: Expanded;
  variant: 'sidebar' | 'popover';
  treeRef?: RefObject<HTMLDivElement | null>;
  /** ↑ on the first row: back to the navigation above the tree. */
  onLeaveUp?: () => void;
  /** After an item opens from the tree, as a popover that closes. */
  onChoose?: (item: ItemNode) => void;
}) {
  const app = useApp();
  const navigate = useNavigate();
  const pins = usePins();
  const ui = useShellUi();
  // "MCP aberta", "MCP recolhida": the live region says what a toggle did.
  const say = (folderId: string, opened: boolean) => {
    const folder = rows.find((row): row is FolderNode => row.key === folderKey(folderId));
    if (folder) ui.announce(`${folder.folder.name} ${opened ? 'aberta' : 'recolhida'}`);
  };
  const setOpenFolders = (ids: string[]) => {
    const before = expanded.expanded;
    expanded.setExpanded(ids);
    const opened = ids.find((id) => !before.has(id));
    const closed = [...before].find((id) => !ids.includes(id));
    if (opened) say(opened, true);
    else if (closed) say(closed, false);
  };
  const archived = Boolean(project.archivedAt);
  const linkPress = useRef<LinkPress | null>(null);
  const [moving, setMoving] = useState<{ node: ItemNode; neighbour: string | null } | null>(null);
  const ownRef = useRef<HTMLDivElement>(null);
  const tree = treeRef ?? ownRef;
  // A row by its key, found again at each use: the data may change, and React Aria redraw the row, while a
  // menu is open on it.
  const rowByKey = (key: string | null) =>
    key ? (tree.current?.querySelector<HTMLElement>(`[role="row"][data-key="${CSS.escape(key)}"]`) ?? null) : null;
  const moveAnchor: RefObject<HTMLElement | null> = {
    get current() {
      return rowByKey(moving?.node.key ?? null) ?? tree.current;
    },
  };

  // The open item's row stays in view, as when a link or the search arrives at an item of a closed folder.
  const current = rows
    .flatMap((row) => (row.kind === 'folder' ? row.children : [row]))
    .find((row): row is ItemNode => row.kind === 'item' && row.current);
  const currentKey = current?.key;
  useLayoutEffect(() => {
    if (!currentKey) return;
    tree.current?.querySelector(`[data-key="${CSS.escape(currentKey)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [currentKey, tree]);

  const open = (node: ItemNode) => {
    const press = linkPress.current;
    linkPress.current = null;
    // A ⌘-click or a middle click opens another tab through the link; the page stays.
    if (press && performance.now() - press.at < 1000 && press.modified) return;
    void navigate({ href: paths.item(project.id, node.item.type, node.item.id) });
    onChoose?.(node);
  };
  const findNode = (key: string): TreeNode | undefined =>
    rows.flatMap((row) => (row.kind === 'folder' ? [row, ...row.children] : [row])).find((row) => row.key === key);

  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const row = rowOf(event.target);
    const key = row?.dataset.key;
    const kind = key ? rowKind(key) : null;
    if (!row || !key || !kind) return;
    const first = tree.current?.querySelector('[role="row"]') === row;
    const action = treeKeyAction(event, kind, { first, chordPending: chordPending() });
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (action === 'forward') forwardToShortcuts(event);
    else if (action === 'leave-up') onLeaveUp?.();
    else if (action === 'pin' || action === 'move') {
      const node = findNode(key);
      if (node?.kind !== 'item') return;
      if (action === 'pin') {
        if (node.item.pinnedAt) void pins.unpin(node.item.type, node.item.id);
        else void pins.pin(node.item.type, node.item.id);
      } else if (!archived) {
        const all = [...(tree.current?.querySelectorAll<HTMLElement>('[role="row"]') ?? [])];
        const at = all.indexOf(row);
        setMoving({ node, neighbour: (all[at + 1] ?? all[at - 1])?.dataset.key ?? null });
      }
    }
  }

  const render = (node: TreeNode): ReactElement => {
    if (node.kind === 'folder') return folderItem(node);
    if (node.kind === 'item')
      return (
        <TreeItem
          key={node.key}
          id={node.key}
          textValue={node.item.title}
          aria-label={itemLabel(node)}
          className={cx('tree-row', 'tree-row--item', node.current && 'is-current', node.lastPin && 'is-last-pin')}
          onAction={() => open(node)}
        >
          <TreeItemContent>
            <ItemRow
              node={node}
              href={paths.item(project.id, node.item.type, node.item.id)}
              onPointerDown={(event) => {
                linkPress.current = { modified: modifiedClick(event) || event.button !== 0, at: event.timeStamp };
              }}
              onUnpin={variant === 'sidebar' ? () => void pins.unpin(node.item.type, node.item.id) : undefined}
            />
          </TreeItemContent>
        </TreeItem>
      );
    if (node.kind === 'more') {
      const folder = node.folderId
        ? rows.find((row): row is FolderNode => row.key === folderKey(node.folderId ?? ''))
        : null;
      return (
        <TreeItem
          key={node.key}
          id={node.key}
          textValue="Ver todos"
          aria-label={moreLabel(node, folder?.folder.name ?? null)}
          className="tree-row tree-row--more"
          onAction={() => {
            void navigate({ href: paths.index(project.id) });
          }}
        >
          <TreeItemContent>
            <MoreRow node={node} />
          </TreeItemContent>
        </TreeItem>
      );
    }
    return (
      <TreeItem key={node.key} id={node.key} textValue="Pasta vazia" className="tree-row tree-row--empty">
        <TreeItemContent>
          <EmptyFolderRow
            onNewDocument={archived ? undefined : () => void app.newDocument(project.id, node.folder.id)}
            onNewDrawing={archived ? undefined : () => void app.newCanvas(project.id, node.folder.id)}
          />
        </TreeItemContent>
      </TreeItem>
    );
  };

  function folderItem(node: FolderNode) {
    return (
      <TreeItem
        key={node.key}
        id={node.key}
        textValue={node.folder.name}
        aria-label={folderLabel(node)}
        className={cx('tree-row', 'tree-row--folder', node.holdsCurrent && !node.expanded && 'holds-current')}
        onAction={() => {
          const opening = !expanded.isExpanded(node.folder.id);
          expanded.toggle(node.folder.id);
          say(node.folder.id, opening);
        }}
      >
        <TreeItemContent>{({ isExpanded }) => <FolderRow node={node} expanded={isExpanded} />}</TreeItemContent>
        {node.children.map(render)}
      </TreeItem>
    );
  }

  const expandedKeys = new Set<Key>([...expanded.expanded].map(folderKey));
  return (
    <div className="items-tree" data-variant={variant} onKeyDownCapture={onKeyDownCapture}>
      <Tree
        ref={tree}
        aria-label={`Itens de ${project.name}`}
        className="items-tree__tree"
        selectionMode="none"
        escapeKeyBehavior="none"
        expandedKeys={expandedKeys}
        onExpandedChange={(keys) =>
          setOpenFolders(
            [...keys].flatMap((key) =>
              String(key).startsWith('folder:') ? [String(key).slice('folder:'.length)] : [],
            ),
          )
        }
        renderEmptyState={() => <p className="items-tree__empty">Nada aqui ainda.</p>}
      >
        {rows.map(render)}
      </Tree>
      {moving && (
        <MoveToProjectMenu
          type={moving.node.item.type}
          id={moving.node.item.id}
          projectId={project.id}
          triggerRef={moveAnchor}
          isOpen
          onOpenChange={(isOpen) => !isOpen && setMoving(null)}
          onMoved={() => {
            const next = rowByKey(moving.neighbour);
            if (next) next.focus();
            else focusPageTitle();
          }}
        />
      )}
    </div>
  );
}
