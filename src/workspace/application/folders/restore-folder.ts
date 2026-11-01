import { AppError } from '@tinyfold/core/application';
import { restoredPosition } from '../../domain/folders.js';
import { MAX_PINNED } from '../../domain/project.js';
import { assertVersion } from '../helpers.js';
import type { WorkspaceContext } from '../ports.js';
import type { RestoreFolderInput } from '../schemas/folders.js';
import { assertNameFree, assertRoomForFolder, renumberFolders, requireProjectForFolders } from './folder-rules.js';

/**
 * Undoes deleteFolder with the lists it answered. The folder comes back at the position it had, or
 * at the end, with a new version. Then each listed item still as the deletion left it comes back:
 *
 * - `moved`: a live item of the folder's project still at the root goes back into the folder, without
 *   an edit. It keeps the pin it has, or gets back the one it lost.
 * - `trashed`: an item still in the trash, from this folder and at the listed version, is restored
 *   into it, with a new version, the current date and its pin back.
 *
 * Pins come back while the folder has room for them. Every other item, changed since, is skipped.
 */
export function restoreFolder(ctx: WorkspaceContext, input: RestoreFolderInput) {
  return ctx.write('workspace.restoreFolder', input, async (repo) => {
    const folder = await repo.findFolder(input.id);
    if (!folder) throw new AppError('NOT_FOUND', 'A pasta não está disponível.');
    assertVersion(folder.version, input.expectedVersion);
    if (!folder.deletedAt) throw new AppError('DOMAIN_RULE', 'Esta pasta não foi excluída.');
    await requireProjectForFolders(repo, folder.projectId);
    const folders = await repo.activeFolders(folder.projectId);
    assertNameFree(folders, folder.name, folder.id, ' Renomeie-a antes de desfazer.');
    assertRoomForFolder(folders);

    const now = ctx.now();
    const version = folder.version + 1;
    const position = restoredPosition(folder.position, folders.length);
    await repo.saveFolder({ ...folder, version, position, updatedAt: now, deletedAt: null }, folder.version);
    await renumberFolders(repo, folders.toSpliced(position, 0, { ...folder, position }));

    let pins = 0;
    const pinIfRoom = (pinnedAt: string | null) => {
      if (pinnedAt === null || pins >= MAX_PINNED) return null;
      pins += 1;
      return pinnedAt;
    };
    let restored = 0;
    for (const listed of input.moved) {
      const item = await repo.findItem(listed.type, listed.id);
      if (!item || item.deletedAt || item.projectId !== folder.projectId || item.folderId !== null) continue;
      await repo.placeItem(item.type, item.id, folder.id, pinIfRoom(item.pinnedAt ?? listed.pinnedAt));
      restored += 1;
    }
    for (const listed of input.trashed) {
      const item = await repo.findItem(listed.type, listed.id);
      if (!item?.deletedAt || item.folderId !== folder.id || item.version !== listed.version) continue;
      const place = { folderId: folder.id, pinnedAt: pinIfRoom(listed.pinnedAt) };
      await repo.restoreItem(item.type, item.id, place, now, item.version);
      restored += 1;
    }
    return {
      id: folder.id,
      version,
      position,
      restored,
      skipped: input.moved.length + input.trashed.length - restored,
    };
  });
}
