import { z } from 'zod';
import { edit, id, instant, version } from '#core/application';
import { FOLDER_LIMITS } from '../../domain/folders.js';
import { NAV_ITEM_TYPES } from '../../domain/navigation.js';

const type = z.enum(NAV_ITEM_TYPES);
const pinnedAt = instant.nullable();

/** Deletes a folder, sending its items to the root or, with `withItems`, to the trash. */
export const DeleteFolderInput = z.object({ ...edit, withItems: z.boolean() });
/** Undoes a deletion with the lists deleteFolder answered. */
export const RestoreFolderInput = z.object({
  ...edit,
  moved: z.array(z.object({ type, id, pinnedAt, keptPin: z.boolean() })).max(FOLDER_LIMITS.restoredItems),
  trashed: z.array(z.object({ type, id, version, pinnedAt })).max(FOLDER_LIMITS.restoredItems),
});

export type DeleteFolderInput = z.infer<typeof DeleteFolderInput>;
export type RestoreFolderInput = z.infer<typeof RestoreFolderInput>;
