import type { PointerEvent, ReactElement } from 'react';
import { TreeItem, TreeItemContent } from 'react-aria-components';
import type { Project } from '../../../lib/types';
import { paths } from '../../../navigation/paths';
import { FolderTools } from '../../folders/FolderMenu';
import { EmptyFolderRow } from './EmptyFolderRow';
import { FolderNameField } from './FolderNameField';
import { FolderRow } from './FolderRow';
import { ItemRow } from './ItemRow';
import { MoreRow } from './MoreRow';
import { folderLabel, itemLabel, moreLabel } from './tree-labels';
import { type EmptyNode, type FolderNode, folderKey, type ItemNode, type MoreNode, type TreeNode } from './tree-rows';
import type { TreeEditing } from './use-tree-editing';
import { DRAFT_KEY } from './use-tree-folders';

/** What the rows need from the tree: the project, the actions and, in the sidebar, the folder editing. */
export interface TreeNodeContext {
  project: Project;
  rows: readonly TreeNode[];
  editing: TreeEditing | undefined;
  /** An item chosen with Enter or a click. */
  onOpen: (node: ItemNode) => void;
  /** A pointer went down on an item's link, to tell a ⌘-click or a middle click from a plain one. */
  onLinkPress: (event: PointerEvent<Element>) => void;
  /** A folder row chosen: it opens or closes. */
  onToggle: (folderId: string) => void;
  onNew: (type: 'document' | 'drawing', folderId: string) => void;
  /** The unpin button of a pinned item, in the sidebar. */
  onUnpin: ((node: ItemNode) => void) | undefined;
  navigate: (href: string) => void;
}

function itemNode(node: ItemNode, context: TreeNodeContext) {
  const { project, onUnpin } = context;
  return (
    <TreeItem
      key={node.key}
      id={node.key}
      textValue={node.item.title}
      aria-label={itemLabel(node)}
      className="tree-row tree-row--item"
      data-current={node.current || undefined}
      data-last-pin={node.lastPin || undefined}
      onAction={() => context.onOpen(node)}
    >
      <TreeItemContent>
        <ItemRow
          node={node}
          href={paths.item(project.id, node.item.type, node.item.id)}
          onPointerDown={context.onLinkPress}
          onUnpin={onUnpin ? () => onUnpin(node) : undefined}
        />
      </TreeItemContent>
    </TreeItem>
  );
}

function moreNode(node: MoreNode, context: TreeNodeContext) {
  const folder = node.folderId
    ? context.rows.find((row): row is FolderNode => row.key === folderKey(node.folderId ?? ''))
    : null;
  return (
    <TreeItem
      key={node.key}
      id={node.key}
      textValue="Ver todos"
      aria-label={moreLabel(node, folder?.folder.name ?? null)}
      className="tree-row tree-row--more"
      // The rest of that level: the Índice filtered by the folder, or by the root.
      onAction={() => context.navigate(paths.index(context.project.id, { pasta: node.folderId ?? 'raiz' }))}
    >
      <TreeItemContent>
        <MoreRow node={node} />
      </TreeItemContent>
    </TreeItem>
  );
}

function emptyNode(node: EmptyNode, context: TreeNodeContext) {
  const archived = Boolean(context.project.archivedAt);
  return (
    <TreeItem key={node.key} id={node.key} textValue="Pasta vazia" className="tree-row tree-row--empty">
      <TreeItemContent>
        <EmptyFolderRow
          onNewDocument={archived ? undefined : () => context.onNew('document', node.folder.id)}
          onNewDrawing={archived ? undefined : () => context.onNew('drawing', node.folder.id)}
        />
      </TreeItemContent>
    </TreeItem>
  );
}

/** The other folders' names, which a new or renamed folder may not take. */
const others = (editing: TreeEditing, id: string | null) =>
  editing.folders.folders.filter((folder) => folder.id !== id).map((folder) => folder.name);

function folderNode(node: FolderNode, context: TreeNodeContext) {
  const { editing } = context;
  const renaming = editing?.folders.renaming === node.folder.id;
  return (
    <TreeItem
      key={node.key}
      id={node.key}
      textValue={node.folder.name}
      aria-label={folderLabel(node)}
      className="tree-row tree-row--folder"
      data-holds-current={(node.holdsCurrent && !node.expanded) || undefined}
      onAction={() => !renaming && context.onToggle(node.folder.id)}
    >
      <TreeItemContent>
        {({ isExpanded }) => (
          <FolderRow
            node={node}
            expanded={isExpanded}
            field={
              editing && renaming ? (
                <FolderNameField
                  mode="rename"
                  initial={node.folder.name}
                  label={`Novo nome da pasta ${node.folder.name}`}
                  taken={others(editing, node.folder.id)}
                  onSubmit={(name) => editing.folders.renameSubmit(node.folder, name)}
                  onCancel={() => editing.folders.renameCancel(node.folder)}
                  onTakenOnLeave={editing.folders.renameTakenOnLeave}
                />
              ) : undefined
            }
            tools={
              editing?.editable ? (
                <FolderTools
                  name={node.folder.name}
                  hasItems={node.folder.total > 0}
                  first={editing.folders.isFirst(node.folder)}
                  last={editing.folders.isLast(node.folder)}
                  menuOpen={editing.folders.menuFor === node.folder.id}
                  onMenuOpenChange={(isOpen) => editing.folders.setMenuFor(isOpen ? node.folder.id : null)}
                  onNew={(kind) => context.onNew(kind, node.folder.id)}
                  onAction={(action) => editing.folders.menuAction(node.folder, action)}
                />
              ) : undefined
            }
          />
        )}
      </TreeItemContent>
      {node.children.map((child) => treeNode(child, context))}
    </TreeItem>
  );
}

/** The provisional row where a new folder gets its name, after the root's pins. */
function draftNode(editing: TreeEditing) {
  return (
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
              taken={others(editing, null)}
              onSubmit={editing.folders.createSubmit}
              onCancel={editing.folders.createCancel}
              onTakenOnLeave={editing.folders.createTakenOnLeave}
            />
          }
        />
      </TreeItemContent>
    </TreeItem>
  );
}

function treeNode(node: TreeNode, context: TreeNodeContext): ReactElement {
  if (node.kind === 'folder') return folderNode(node, context);
  if (node.kind === 'item') return itemNode(node, context);
  if (node.kind === 'more') return moreNode(node, context);
  return emptyNode(node, context);
}

/** The tree's rows as React Aria items, with the new folder's row after the root's pins while it is named. */
export function treeNodes(context: TreeNodeContext): ReactElement[] {
  const { rows, editing } = context;
  const pinsEnd = rows.findIndex((row) => !(row.kind === 'item' && row.item.pinnedAt && row.item.folderId === null));
  const at = pinsEnd < 0 ? rows.length : pinsEnd;
  const render = (node: TreeNode) => treeNode(node, context);
  const draft = editing?.folders.draft ? [draftNode(editing)] : [];
  return [...rows.slice(0, at).map(render), ...draft, ...rows.slice(at).map(render)];
}
