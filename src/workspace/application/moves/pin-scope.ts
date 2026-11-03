import { MAX_PINNED } from '../../domain/project.js';
import { workspaceErrors } from '../errors.js';
import type { FolderRepository } from '../ports/folders.js';
import type { PinRepository } from '../ports/pins.js';

/** The pin an item keeps when it changes scope: its own while the destination has room, none otherwise. */
export async function keepPinIfRoom(
  repo: Pick<PinRepository, 'pinnedInScope'>,
  item: { projectId: string; pinnedAt: string | null },
  folderId: string | null,
): Promise<string | null> {
  if (item.pinnedAt === null) return null;
  return (await repo.pinnedInScope(item.projectId, folderId)) < MAX_PINNED ? item.pinnedAt : null;
}

/** Refuses a pin beyond MAX_PINNED in the item's scope, naming it: the project's root or the folder. */
export async function assertRoomForPin(
  repo: Pick<PinRepository, 'pinnedInScope'> & Pick<FolderRepository, 'findFolder'>,
  item: { projectId: string; folderId: string | null },
): Promise<void> {
  if ((await repo.pinnedInScope(item.projectId, item.folderId)) < MAX_PINNED) return;
  const folder = item.folderId ? await repo.findFolder(item.folderId) : undefined;
  const scope = folder ? `em ${folder.name}` : 'na raiz do projeto';
  throw workspaceErrors.pinLimit(scope);
}
