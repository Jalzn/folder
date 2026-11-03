import { assertVersion } from '#core/application';
import type { IsoInstant } from '#core/domain';
import type { FiledItem } from '../../domain/items.js';
import { workspaceErrors } from '../errors.js';
import { requireFolderInProject, requireProjectForFolders } from '../folders/folder-rules.js';
import { requireLiveItem } from '../items/require-item.js';
import type { MovePorts, WorkspaceFlowContext } from '../ports/context.js';
import { requireActiveProject } from '../projects/project-lookups.js';
import type { MoveItemInput } from '../schemas/moves.js';
import { keepPinIfRoom } from './pin-scope.js';

/** Where a moved item is now, and the version an open editor saves against from then on. */
export interface MovedItem {
  id: string;
  projectId: string;
  folderId: string | null;
  version: number;
  pinnedAt: IsoInstant | null;
}

const where = (item: FiledItem): MovedItem => ({
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
export function moveItem(ctx: WorkspaceFlowContext<MovePorts>, input: MoveItemInput): Promise<MovedItem> {
  return ctx.write('workspace.moveItem', input, async (repo) => {
    const item = await requireLiveItem(repo, input.type, input.id);
    return item.projectId === input.projectId ? fileInFolder(repo, item, input) : moveToProject(repo, item, input);
  });
}

async function moveToProject(repo: Pick<MovePorts, 'findProject' | 'moveItem'>, item: FiledItem, input: MoveItemInput) {
  if (input.expectedVersion === undefined) throw workspaceErrors.moveVersionRequired();
  if (input.folderId) throw workspaceErrors.moveProjectFirst();
  assertVersion(item.version, input.expectedVersion);
  const project = await requireActiveProject(repo, input.projectId);
  await repo.moveItem({ type: input.type, id: item.id, projectId: project.id, expectedVersion: item.version });
  return { id: item.id, projectId: project.id, folderId: null, version: item.version + 1, pinnedAt: null };
}

async function fileInFolder(
  repo: Pick<MovePorts, 'findProject' | 'findFolder' | 'pinnedInScope' | 'placeItem'>,
  item: FiledItem,
  input: MoveItemInput,
) {
  const folderId = input.folderId;
  if (folderId === undefined || folderId === item.folderId) return where(item);
  await requireProjectForFolders(repo, item.projectId);
  if (folderId !== null) await requireFolderInProject(repo, folderId, item.projectId);
  const pinnedAt = await keepPinIfRoom(repo, item, folderId);
  await repo.placeItem({ type: input.type, id: item.id, folderId: folderId, pinnedAt: pinnedAt });
  return { ...where(item), folderId, pinnedAt };
}
