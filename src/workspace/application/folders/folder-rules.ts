import { AppError } from '@tinyfold/core/application';
import type { Folder } from '../../domain/folders.js';
import type { FolderRepository } from '../ports.js';

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
