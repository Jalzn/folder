import { AppError } from '@tinyfold/core/application';
import type { Canvas } from '../../domain/canvas.js';
import type { Document } from '../../domain/models.js';
import { requireFolderInProject, requireProjectForFolders } from '../folders/folder-rules.js';
import { assertVersion, requireActiveProject, requireLiveItem } from '../helpers.js';
import type { WorkspaceContext, WorkspaceRepository } from '../ports.js';
import type { MoveItemInput } from '../schemas/moves.js';
import { keepPinIfRoom } from './pin-scope.js';

/** Where a moved item is now, and the version an open editor saves against from then on. */
export interface MovedItem {
  id: string;
  projectId: string;
  folderId: string | null;
  version: number;
  pinnedAt: string | null;
}

const where = (item: Document | Canvas): MovedItem => ({
  id: item.id,
  projectId: item.projectId,
  folderId: item.folderId,
  version: item.version,
  pinnedAt: item.pinnedAt,
});

/**
 * Says where a document or drawing lives, without its content: another project, or a folder or the
 * root of its own. Neither is an edit: `updatedAt` stays, so the item keeps its place among the ones
 * edited recently.
 *
 * - Another project needs `expectedVersion` and raises the version, so an editor still saving with
 *   the old one learns about the move. The item goes to that project's root, unpinned.
 * - Another folder, or the root, needs no version and keeps it, so it never conflicts with an open
 *   editor. The item keeps its pin while the destination has room.
 * - The place it already is changes nothing.
 */
export function moveItem(ctx: WorkspaceContext, input: MoveItemInput): Promise<MovedItem> {
  return ctx.write('workspace.moveItem', input, async (repo) => {
    const item = await requireLiveItem(repo, input.type, input.id);
    return item.projectId === input.projectId ? fileInFolder(repo, item, input) : moveToProject(repo, item, input);
  });
}

async function moveToProject(repo: WorkspaceRepository, item: Document | Canvas, input: MoveItemInput) {
  if (input.expectedVersion === undefined) throw new AppError('VALIDATION', 'Informe a versão para mudar de projeto.');
  if (input.folderId) throw new AppError('VALIDATION', 'Mova para o projeto antes de escolher a pasta.');
  assertVersion(item.version, input.expectedVersion);
  const project = await requireActiveProject(repo, input.projectId);
  await repo.moveItem(input.type, item.id, project.id, item.version);
  return { id: item.id, projectId: project.id, folderId: null, version: item.version + 1, pinnedAt: null };
}

async function fileInFolder(repo: WorkspaceRepository, item: Document | Canvas, input: MoveItemInput) {
  const folderId = input.folderId;
  if (folderId === undefined || folderId === item.folderId) return where(item);
  await requireProjectForFolders(repo, item.projectId);
  if (folderId !== null) await requireFolderInProject(repo, folderId, item.projectId);
  const pinnedAt = await keepPinIfRoom(repo, item, folderId);
  await repo.placeItem(input.type, item.id, folderId, pinnedAt);
  return { ...where(item), folderId, pinnedAt };
}
