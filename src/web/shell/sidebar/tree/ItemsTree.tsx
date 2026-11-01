import { useNavigate } from '@tanstack/react-router';
import { type KeyboardEvent, type ReactElement, type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { type Key, Tree, TreeItem, TreeItemContent } from 'react-aria-components';
import { cx } from '../../../lib/cx';
import type { Project } from '../../../lib/types';
import { paths } from '../../../router/paths';
import { focusPageTitle } from '../../../ui';
import { useApp } from '../../AppProvider';
import { DeleteFolderDialog } from '../../folders/DeleteFolderDialog';
import { FolderTools } from '../../folders/FolderMenu';
import { MoveMenus } from '../../folders/MoveMenus';
import { useMoveToFolder } from '../../folders/use-move-to-folder';
import { chordPending, forwardToShortcuts } from '../../keyboard/use-shortcuts';
import { NewItemPopover } from '../../project/NewItemMenu';
import { usePins } from '../../project/use-pins';
import { useShellUi } from '../../shell-ui';
import { EmptyFolderRow } from './EmptyFolderRow';
import { FolderNameField } from './FolderNameField';
import { FolderRow } from './FolderRow';
import { ItemRow, modifiedClick } from './ItemRow';
import { MoreRow } from './MoreRow';
import { rowKind, TYPEAHEAD_MS, treeKeyAction, typesAhead } from './tree-keys';
import { folderLabel, itemLabel, moreLabel } from './tree-labels';
import { type FolderNode, folderKey, type ItemNode, type TreeNode } from './tree-rows';
import type { useExpandedFolders } from './use-expanded-folders';
import { useTabEntry } from './use-tab-entry';
import { useTreeDnd } from './use-tree-dnd';
import { DRAFT_KEY, useTreeFolders } from './use-tree-folders';

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
  // When the type-to-select last took a letter, so the next letters go on its search.
  const typedAt = useRef(Number.NEGATIVE_INFINITY);
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
  const editable = variant === 'sidebar' && !archived;
  const folders = useTreeFolders({ project, rows, expanded, enabled: editable, rowByKey });
  const moveToFolder = useMoveToFolder();
  const dragAndDropHooks = useTreeDnd({
    projectId: project.id,
    tree,
    rows,
    expanded,
    enabled: editable && !folders.renaming && !folders.draft,
    onMoveItem: (item, folderId) => {
      const folder = folders.folders.find((each) => each.id === folderId) ?? null;
      void moveToFolder.move(item, folder).then((moved) => moved && folderId && expanded.expand(folderId));
    },
    onReorder: (folderId, beforeFolderId) => void folders.place(folderId, beforeFolderId),
  });
  const newHereAnchor: RefObject<HTMLElement | null> = {
    get current() {
      return rowByKey(folders.newHere?.key ?? null) ?? tree.current;
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
  // The row that takes the focus says it is the page on screen, as its link does; React Aria's row takes no
  // aria-current of its own, so it is set on the element, after every render that may redraw it.
  useLayoutEffect(() => {
    for (const row of tree.current?.querySelectorAll('[role="row"][aria-current]') ?? [])
      if (row.getAttribute('data-key') !== currentKey) row.removeAttribute('aria-current');
    if (currentKey) rowByKey(currentKey)?.setAttribute('aria-current', 'page');
  });

  const tabEntry = useTabEntry(() => (currentKey ? rowByKey(currentKey) : null));

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
    // A folder's name field owns its keys, composition included: only Enter and Esc go on to it past the
    // row, which would move the focus on an arrow, and the type-to-select, which would take a letter or a
    // space. Nothing here prevents the default, so the caret, the selection and the typing stay the field's.
    if (event.target instanceof Element && event.target.closest('input, textarea')) {
      if (event.key !== 'Enter' && event.key !== 'Escape') event.stopPropagation();
      return;
    }
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const row = rowOf(event.target);
    const key = row?.dataset.key;
    const kind = key ? rowKind(key) : null;
    if (!row || !key || !kind) return;
    const first = tree.current?.querySelector('[role="row"]') === row;
    const typing = event.timeStamp - typedAt.current < TYPEAHEAD_MS;
    const action = treeKeyAction(event, kind, {
      first,
      chordPending: chordPending(),
      inFolder: row.getAttribute('aria-level') === '2',
      editable,
      expanded: row.getAttribute('aria-expanded') === 'true',
      typing,
    });
    // A letter the type-to-select takes starts or goes on its search.
    if (!action && typesAhead(event)) typedAt.current = event.timeStamp;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (action === 'forward') forwardToShortcuts(event);
    else if (action === 'leave-up') onLeaveUp?.();
    else if (action === 'first-child') {
      const node = findNode(key);
      const child = node?.kind === 'folder' ? node.children[0] : undefined;
      if (child) rowByKey(child.key)?.focus();
    } else if (
      action === 'new-here' ||
      action === 'rename' ||
      action === 'move-up' ||
      action === 'move-down' ||
      action === 'menu'
    )
      folders.keyAction(action, findNode(key), key);
    else if (action === 'pin' || action === 'move') {
      const node = findNode(key);
      if (node?.kind !== 'item') return;
      if (action === 'pin') {
        const pinned = Boolean(node.item.pinnedAt);
        void (pinned ? pins.unpin(node.item.type, node.item.id) : pins.pin(node.item.type, node.item.id)).then(
          (done) => done && ui.announce(pinned ? 'Desafixado.' : 'Fixado.'),
        );
      } else if (!archived) {
        const all = [...(tree.current?.querySelectorAll<HTMLElement>('[role="row"]') ?? [])];
        const at = all.indexOf(row);
        setMoving({ node, neighbour: (all[at + 1] ?? all[at - 1])?.dataset.key ?? null });
      }
    }
  }

  const render = (node: TreeNode): ReactElement => {
    if (node.kind === 'folder') return folderItem(node, folders.renaming === node.folder.id);
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
            // The rest of that level: the Índice filtered by the folder, or by the root.
            void navigate({ href: paths.index(project.id, { pasta: node.folderId ?? 'raiz' }) });
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

  function folderItem(node: FolderNode, renaming: boolean) {
    return (
      <TreeItem
        key={node.key}
        id={node.key}
        textValue={node.folder.name}
        aria-label={folderLabel(node)}
        className={cx('tree-row', 'tree-row--folder', node.holdsCurrent && !node.expanded && 'holds-current')}
        onAction={() => {
          if (renaming) return;
          const opening = !expanded.isExpanded(node.folder.id);
          expanded.toggle(node.folder.id);
          say(node.folder.id, opening);
        }}
      >
        <TreeItemContent>
          {({ isExpanded }) => (
            <FolderRow
              node={node}
              expanded={isExpanded}
              field={
                renaming ? (
                  <FolderNameField
                    mode="rename"
                    initial={node.folder.name}
                    label={`Novo nome da pasta ${node.folder.name}`}
                    taken={others(node.folder.id)}
                    onSubmit={(name) => folders.renameSubmit(node.folder, name)}
                    onCancel={() => folders.renameCancel(node.folder)}
                    onTakenOnLeave={folders.renameTakenOnLeave}
                  />
                ) : undefined
              }
              tools={
                editable ? (
                  <FolderTools
                    name={node.folder.name}
                    hasItems={node.folder.total > 0}
                    first={folders.isFirst(node.folder)}
                    last={folders.isLast(node.folder)}
                    menuOpen={folders.menuFor === node.folder.id}
                    onMenuOpenChange={(isOpen) => folders.setMenuFor(isOpen ? node.folder.id : null)}
                    onNew={(kind) =>
                      void (kind === 'document'
                        ? app.newDocument(project.id, node.folder.id)
                        : app.newCanvas(project.id, node.folder.id))
                    }
                    onAction={(action) => folders.menuAction(node.folder, action)}
                  />
                ) : undefined
              }
            />
          )}
        </TreeItemContent>
        {node.children.map(render)}
      </TreeItem>
    );
  }

  /** The other folders' names, which a new or renamed folder may not take. */
  const others = (id: string | null) =>
    folders.folders.filter((folder) => folder.id !== id).map((folder) => folder.name);

  /** The provisional row where a new folder gets its name, at the top of the folders. */
  const draftItem = folders.draft ? (
    <TreeItem
      key={DRAFT_KEY}
      id={DRAFT_KEY}
      textValue="Nova pasta"
      className="tree-row tree-row--folder tree-row--draft"
    >
      <TreeItemContent>
        <FolderRow
          node={{ folder: { id: '', name: 'Nova pasta', position: 0, version: 0, total: 0, items: [] }, pending: 0 }}
          expanded={false}
          field={
            <FolderNameField
              mode="create"
              initial="Nova pasta"
              label="Nome da nova pasta"
              taken={others(null)}
              onSubmit={folders.createSubmit}
              onCancel={folders.createCancel}
              onTakenOnLeave={folders.createTakenOnLeave}
            />
          }
        />
      </TreeItemContent>
    </TreeItem>
  ) : null;
  const pinsEnd = rows.findIndex((row) => !(row.kind === 'item' && row.item.pinnedAt && row.item.folderId === null));
  const at = pinsEnd < 0 ? rows.length : pinsEnd;
  const rendered = [...rows.slice(0, at).map(render), ...(draftItem ? [draftItem] : []), ...rows.slice(at).map(render)];

  const expandedKeys = new Set<Key>([...expanded.expanded].map(folderKey));
  return (
    <div className="items-tree" data-variant={variant} onKeyDownCapture={onKeyDownCapture} onFocusCapture={tabEntry}>
      <Tree
        ref={tree}
        aria-label={`Itens de ${project.name}`}
        className="items-tree__tree"
        selectionMode="none"
        escapeKeyBehavior="none"
        dragAndDropHooks={dragAndDropHooks}
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
        {rendered}
      </Tree>
      <DeleteFolderDialog
        folder={folders.confirming?.folder ?? null}
        open={folders.confirming?.open ?? false}
        pending={folders.busy}
        onConfirm={() => void folders.confirmDelete()}
        onClose={folders.closeConfirm}
      />
      {folders.newHere && (
        <NewItemPopover
          project={project}
          folder={folders.newHere.folder}
          triggerRef={newHereAnchor}
          isOpen
          placement="bottom start"
          onOpenChange={(isOpen) => !isOpen && folders.closeNewHere()}
        />
      )}
      {moving && (
        <MoveMenus
          item={{
            type: moving.node.item.type,
            id: moving.node.item.id,
            projectId: project.id,
            folderId: moving.node.item.folderId,
            pinned: moving.node.item.pinnedAt !== null,
          }}
          triggerRef={moveAnchor}
          onClose={() => {
            // Closed without a move: back to the row, also where the menu leaves the focus on nothing, as
            // inside the sidebar over the page.
            const key = moving.node.key;
            setMoving(null);
            requestAnimationFrame(() => {
              const active = document.activeElement;
              if (!active || active === document.body) rowByKey(key)?.focus();
            });
          }}
          onMovedToFolder={(folderId) => {
            // The folder that receives an item opens, and the item keeps the focus in its new place.
            if (folderId) expanded.expand(folderId);
            folders.focusWhenThere(moving.node.key, () => {
              const next = rowByKey(moving.neighbour);
              if (next) next.focus();
              else focusPageTitle();
            });
          }}
          onMovedToProject={() => {
            const next = rowByKey(moving.neighbour);
            if (next) next.focus();
            else focusPageTitle();
          }}
        />
      )}
    </div>
  );
}
