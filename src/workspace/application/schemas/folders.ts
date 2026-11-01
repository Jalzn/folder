import { z } from 'zod';
import { FOLDER_LIMITS } from '../../domain/folders.js';
import { NAV_ITEM_TYPES } from '../../domain/navigation.js';
import { edit, id, instant, request, version } from './common.js';

/** The raw name, bounded before folderName collapses its spaces; readFolderName checks the rest. */
const name = z.string().max(10 * FOLDER_LIMITS.nameChars);
const type = z.enum(NAV_ITEM_TYPES);
const pinnedAt = instant.nullable();

/** Without a project, every project's active folders. */
export const ListFoldersInput = z.object({ projectId: id.optional() });
export const CreateFolderInput = z.object({ ...request, projectId: id, name });
export const RenameFolderInput = z.object({ ...edit, name });
/** Places an active folder before another of its project, or at the end with null. */
export const MoveFolderInput = z.object({ ...request, id, beforeFolderId: id.nullable() });
/** Deletes a folder, sending its items to the root or, with `withItems`, to the trash. */
export const DeleteFolderInput = z.object({ ...edit, withItems: z.boolean() });
/** Undoes a deletion with the lists deleteFolder answered. */
export const RestoreFolderInput = z.object({
  ...edit,
  moved: z.array(z.object({ type, id, pinnedAt, keptPin: z.boolean() })).max(FOLDER_LIMITS.restoredItems),
  trashed: z.array(z.object({ type, id, version, pinnedAt })).max(FOLDER_LIMITS.restoredItems),
});

export type ListFoldersInput = z.infer<typeof ListFoldersInput>;
export type CreateFolderInput = z.infer<typeof CreateFolderInput>;
export type RenameFolderInput = z.infer<typeof RenameFolderInput>;
export type MoveFolderInput = z.infer<typeof MoveFolderInput>;
export type DeleteFolderInput = z.infer<typeof DeleteFolderInput>;
export type RestoreFolderInput = z.infer<typeof RestoreFolderInput>;
