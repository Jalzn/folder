import type { NavFolder } from '@tinyfold/workspace/domain';
import { useState } from 'react';
import type { Project } from '../../../lib/types';
import { focusPageTitle, focusWhenPresent, useToast } from '../../../ui';
import type { FolderMenuAction } from '../../folders/FolderMenu';
import { useFolderActions } from '../../folders/use-folder-actions';
import { useSidebarRequests } from '../../shell-ui';
import { useOpenItem } from '../use-open-item';
import type { TreeKeyAction } from './tree-keys';
import { type FolderNode, folderKey, type TreeNode } from './tree-rows';
import type { useExpandedFolders } from './use-expanded-folders';

/** The key of the provisional row where a new folder gets its name. */
export const DRAFT_KEY = 'draft:folder';

type Expanded = ReturnType<typeof useExpandedFolders>;

/**
 * What the tree does with folders (docs/etapas/09-pastas.md, "Ações de pasta"): name a new one in place,
 * rename, reorder, the ⋯ menu, delete with Desfazer and delete with the items after a confirmation, and the
 * Novo menu in a folder. The focus always lands somewhere after each of them: on the folder, the nearest row
 * or the page's title.
 */
export function useTreeFolders({
  project,
  rows,
  expanded,
  enabled,
  rowByKey,
  onDraftCancel,
}: {
  project: Project;
  rows: TreeNode[];
  expanded: Expanded;
  /** The sidebar's tree, in a project that is not archived; the rail's popover only reads. */
  enabled: boolean;
  rowByKey: (key: string | null) => HTMLElement | null;
  /** A new folder given up: the focus goes back to the "+" of Itens. */
  onDraftCancel: () => void;
}) {
  const ui = useSidebarRequests();
  const toast = useToast();
  const open = useOpenItem();
  const actions = useFolderActions(project.id);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ open: boolean; folder: NavFolder } | null>(null);
  const [newHere, setNewHere] = useState<{ folder: NavFolder; key: string } | null>(null);
  const folders = rows.flatMap((row) => (row.kind === 'folder' ? [row.folder] : []));
  const draft = enabled && ui.folderDraft?.projectId === project.id ? ui.folderDraft : null;

  /** Focuses a row once the tree shows it, as a folder the server just created. */
  const focusWhenThere = (key: string) => focusWhenPresent(() => rowByKey(key), { fallback: focusPageTitle });
  /** The row after a folder and its children, or the one before it, for the focus after it goes. */
  function neighbourOf(folder: NavFolder) {
    const all = [
      ...(rowByKey(folderKey(folder.id))?.parentElement?.querySelectorAll<HTMLElement>('[role="row"]') ?? []),
    ];
    const at = all.findIndex((row) => row.dataset.key === folderKey(folder.id));
    if (at < 0) return null;
    const after = all.slice(at + 1).find((row) => row.getAttribute('aria-level') === '1');
    return (after ?? all[at - 1])?.dataset.key ?? null;
  }

  async function createSubmit(name: string) {
    if (!draft) return false;
    const created = await actions.create(name);
    if (!created) return false;
    expanded.expand(created.id);
    // Whoever asked for the folder takes it, as "Mover para pasta…" moving the item into it.
    if (!ui.endFolder(created)) toast(`Pasta “${name}” criada.`);
    focusWhenThere(folderKey(created.id));
    return true;
  }
  function createCancel() {
    ui.endFolder();
    ui.announce('Criação da pasta cancelada.');
    onDraftCancel();
  }
  function createTakenOnLeave(message: string) {
    ui.endFolder();
    toast(message, 'error');
  }

  async function renameSubmit(folder: NavFolder, name: string) {
    const renamed = await actions.rename(folder, name);
    if (!renamed) return false;
    setRenaming(null);
    focusWhenThere(folderKey(folder.id));
    return true;
  }
  function renameCancel(folder: NavFolder) {
    setRenaming(null);
    focusWhenThere(folderKey(folder.id));
  }
  function renameTakenOnLeave(message: string) {
    setRenaming(null);
    toast(message, 'error');
  }

  async function reorder(folder: NavFolder, direction: 'up' | 'down') {
    if (await actions.move(folder, folders, direction)) focusWhenThere(folderKey(folder.id));
  }
  async function remove(folder: NavFolder, withItems: boolean) {
    const neighbour = neighbourOf(folder);
    const done = await actions.remove(folder, withItems, open, () => {
      expanded.expand(folder.id);
      focusWhenThere(folderKey(folder.id));
    });
    if (!done) return false;
    if (neighbour) focusWhenThere(neighbour);
    else focusPageTitle();
    return true;
  }

  function menuAction(folder: NavFolder, action: FolderMenuAction) {
    if (action === 'rename') setRenaming(folder.id);
    else if (action === 'up' || action === 'down') void reorder(folder, action);
    else if (action === 'delete') void remove(folder, false);
    else setConfirming({ open: true, folder });
  }
  async function confirmDelete() {
    if (!confirming) return;
    const done = await remove(confirming.folder, true);
    setConfirming({ ...confirming, open: false });
    if (!done) focusWhenThere(folderKey(confirming.folder.id));
  }

  /** A key the tree hands over for a folder row, or for a row inside a folder (N). */
  function keyAction(action: TreeKeyAction, node: TreeNode | undefined, rowKey: string) {
    const folder =
      node?.kind === 'folder'
        ? node.folder
        : folders.find((each) =>
            rows.some(
              (row) =>
                row.kind === 'folder' &&
                row.folder.id === each.id &&
                row.children.some((child) => child.key === rowKey),
            ),
          );
    if (!folder) return;
    if (action === 'new-here') setNewHere({ folder, key: rowKey });
    else if (action === 'rename') setRenaming(folder.id);
    else if (action === 'move-up') void reorder(folder, 'up');
    else if (action === 'move-down') void reorder(folder, 'down');
    else if (action === 'menu') setMenuFor(folder.id);
  }

  const isFirst = (folder: NavFolder) => folders[0]?.id === folder.id;
  const isLast = (folder: NavFolder) => folders.at(-1)?.id === folder.id;

  /** A folder dragged before another, or last. */
  async function place(folderId: string, beforeFolderId: string | null) {
    const folder = folders.find((each) => each.id === folderId);
    if (folder && (await actions.place(folder, beforeFolderId))) focusWhenThere(folderKey(folderId));
  }

  return {
    place,
    busy: actions.busy,
    draft,
    folders,
    renaming,
    menuFor,
    setMenuFor,
    confirming,
    closeConfirm: () => {
      if (confirming) focusWhenThere(folderKey(confirming.folder.id));
      setConfirming((current) => current && { ...current, open: false });
    },
    confirmDelete,
    newHere,
    closeNewHere: () => setNewHere(null),
    createSubmit,
    createCancel,
    createTakenOnLeave,
    renameSubmit,
    renameCancel,
    renameTakenOnLeave,
    menuAction,
    keyAction,
    isFirst,
    isLast,
  };
}

export type { FolderNode };
