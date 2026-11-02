import { AppError } from '@tinyfold/core/application';
import { FOLDER_LIMITS, type Folder } from '../../domain/folders.js';
import type { Project } from '../../domain/models.js';
import { requireProject } from '../helpers.js';
import { assertNameFree, readName } from '../name-rules.js';
import type { FolderRepository, WorkspaceRepository } from '../ports.js';

/** An active folder: a deleted one takes nothing new and cannot change. */
export async function requireActiveFolder(repo: Pick<FolderRepository, 'findFolder'>, id: string): Promise<Folder> {
  const folder = await repo.findFolder(id);
  if (!folder || folder.deletedAt) throw new AppError('NOT_FOUND', 'A pasta não está disponível.');
  return folder;
}

/** An active folder of the project an item is or goes in. */
export async function requireFolderInProject(
  repo: Pick<FolderRepository, 'findFolder'>,
  id: string,
  projectId: string,
): Promise<Folder> {
  const folder = await requireActiveFolder(repo, id);
  if (folder.projectId !== projectId) throw new AppError('VALIDATION', 'A pasta não é deste projeto.');
  return folder;
}

/**
 * Where a restored item goes: back to its folder while the folder is active, or to the project's root
 * once it was deleted, which `folderGone` tells.
 */
export async function folderAfterRestore(
  repo: Pick<FolderRepository, 'findFolder'>,
  folderId: string | null,
): Promise<{ folderId: string | null; folderGone: boolean }> {
  if (folderId === null) return { folderId, folderGone: false };
  const folder = await repo.findFolder(folderId);
  return folder && !folder.deletedAt ? { folderId, folderGone: false } : { folderId: null, folderGone: true };
}

/** The project whose folders change: an archived project's folders are read-only. */
export async function requireProjectForFolders(repo: WorkspaceRepository, projectId: string): Promise<Project> {
  const project = await requireProject(repo, projectId);
  if (project.archivedAt) throw new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de mudar as pastas.');
  return project;
}

/** A folder's name as stored: see readName. */
export const readFolderName = (raw: string): string => readName(raw, 'pasta', FOLDER_LIMITS.nameChars);

/**
 * Refuses a name another active folder of the project already has, case and accents aside, naming
 * that folder. `except` is the folder being renamed, which may keep its own name in another case.
 */
export const assertFolderNameFree = (folders: readonly Folder[], name: string, except?: string, suffix = ''): void =>
  assertNameFree(folders, name, 'pasta', { ...(except ? { except } : {}), suffix });

/** Refuses the folder after the last one a project may have. */
export function assertRoomForFolder(folders: readonly Folder[]): void {
  if (folders.length >= FOLDER_LIMITS.perProject)
    throw new AppError('DOMAIN_RULE', `Máximo de ${FOLDER_LIMITS.perProject} pastas neste projeto.`);
}

/** Numbers the folders in the given order from 0, writing only the positions that change. */
export async function renumberFolders(repo: FolderRepository, ordered: readonly Folder[]): Promise<void> {
  for (const [position, folder] of ordered.entries())
    if (folder.position !== position) await repo.setFolderPosition(folder.id, position);
}
