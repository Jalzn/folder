import { AppError } from '@tinyfold/core/application';
import { restoredPosition } from '../../domain/order.js';
import { MAX_PINNED } from '../../domain/project.js';
import { assertVersion } from '../helpers.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { RestoreFolderInput } from '../schemas/folders.js';
import {
  assertFolderNameFree,
  assertRoomForFolder,
  renumberFolders,
  requireProjectForFolders,
} from './folder-rules.js';

/**
 * Undoes deleteFolder with the lists it answered. The folder comes back at the position it had, or
 * at the end, with a new version. Then each listed item still as the deletion left it comes back:
 *
 * - `moved`: a live item of the folder's project still at the root goes back into the folder, without
 *   an edit. It takes the pin it has now; only an item that lost its pin to the deletion
 *   (`keptPin: false`) and is still unpinned gets the listed one back, so an item unpinned since
 *   stays unpinned. Nothing records where a root item came from, so this list is the client's word:
 *   a root item listed by mistake goes into the folder too.
 * - `trashed`: an item still in the trash, trashed with the folder (at its instant), from this folder
 *   and at the listed version, is restored into it, with a new version, the current date and its pin
 *   back.
 *
 * A listed pin later than the deletion is not one the deletion answered (a forged list, or a server
 * clock set back between the pin and the deletion): that item comes back without it. Pins come back
 * while the folder has room for them. Every other item, changed since, is skipped.
 */
export function restoreFolder(ctx: WorkspaceContext, input: RestoreFolderInput) {
  return ctx.write('workspace.restoreFolder', input, async (repo) => {
    const folder = await repo.findFolder(input.id);
    if (!folder) throw new AppError('NOT_FOUND', 'A pasta não está disponível.');
    assertVersion(folder.version, input.expectedVersion);
    const { deletedAt } = folder;
    if (!deletedAt) throw new AppError('DOMAIN_RULE', 'Esta pasta não foi excluída.');
    await requireProjectForFolders(repo, folder.projectId);
    const folders = await repo.activeFolders(folder.projectId);
    assertFolderNameFree(folders, folder.name, folder.id, ' Renomeie-a antes de desfazer.');
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
      const pinnedAt = listed.keptPin ? item.pinnedAt : (item.pinnedAt ?? pinBefore(listed.pinnedAt, deletedAt));
      await repo.placeItem(item.type, item.id, folder.id, pinIfRoom(pinnedAt));
      restored += 1;
    }
    for (const listed of input.trashed) {
      const item = await repo.findItem(listed.type, listed.id);
      const fromDeletion = item?.deletedAt === deletedAt && item.folderId === folder.id;
      if (!fromDeletion || item.version !== listed.version) continue;
      const place = { folderId: folder.id, pinnedAt: pinIfRoom(pinBefore(listed.pinnedAt, deletedAt)) };
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

/** A listed pin, or none when it is later than the deletion, which no answer of deleteFolder holds. */
const pinBefore = (pinnedAt: string | null, deletedAt: string): string | null =>
  pinnedAt !== null && Date.parse(pinnedAt) <= Date.parse(deletedAt) ? pinnedAt : null;
