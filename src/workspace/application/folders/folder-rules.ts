import { namedCollection, renumber } from '@tinyfold/core/application';
import { FOLDER_LIMITS, type Folder } from '../../domain/folders.js';
import { workspaceErrors } from '../errors.js';
import type { FolderLifecyclePorts, ProjectFacts, ProjectLookup } from '../ports/context.js';
import { requireProject } from '../projects/project-lookups.js';

/** An active folder: a deleted one takes nothing new and cannot change. */
export async function requireActiveFolder(repo: Pick<FolderLifecyclePorts, 'findFolder'>, id: string): Promise<Folder> {
  const folder = await repo.findFolder(id);
  if (!folder || folder.deletedAt) throw workspaceErrors.folderMissing();
  return folder;
}

/** An active folder of the project an item is or goes in. */
export async function requireFolderInProject(
  repo: Pick<FolderLifecyclePorts, 'findFolder'>,
  id: string,
  projectId: string,
): Promise<Folder> {
  const folder = await requireActiveFolder(repo, id);
  if (folder.projectId !== projectId) throw workspaceErrors.folderProjectMismatch();
  return folder;
}

/** The project whose folders change: an archived project's folders are read-only. */
export async function requireProjectForFolders(repo: ProjectLookup, projectId: string): Promise<ProjectFacts> {
  const project = await requireProject(repo, projectId);
  if (project.archivedAt) throw workspaceErrors.folderProjectArchived();
  return project;
}

/** Numbers the folders in the given order from 0, writing only the positions that change. */
export async function renumberFolders(
  repo: Pick<FolderLifecyclePorts, 'setFolderPosition'>,
  ordered: readonly Folder[],
): Promise<void> {
  await renumber(ordered, (id, position) => repo.setFolderPosition(id, position));
}
const collection = namedCollection({
  thing: 'pasta',
  maxChars: FOLDER_LIMITS.nameChars,
  limit: FOLDER_LIMITS.perProject,
  fullMessage: `Máximo de ${FOLDER_LIMITS.perProject} pastas neste projeto.`,
});
export const assertFolderNameFree = collection.assertNameFree;
export const assertRoomForFolder = collection.assertRoom;
