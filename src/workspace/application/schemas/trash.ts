import { edit, id, request, version } from '@tinyfold/core/application';
import { z } from 'zod';
import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';

export const TRASH_ITEM_TYPES = ['document', 'drawing', 'task'] as const;

export type TrashItemType = (typeof TRASH_ITEM_TYPES)[number];

export const ListTrashInput = z.object({ projectId: id });
/** Deletes a document, drawing or task for good. It must be in the trash, at the version the caller saw. */
export const PurgeItemInput = z.object(edit);
/** The items the trash showed: only those still there, at the same version, are deleted. */
export const EmptyTrashInput = z.object({
  ...request,
  projectId: id,
  items: z.array(z.object({ type: z.enum(TRASH_ITEM_TYPES), id, version })).max(NAVIGATION_LIMITS.trash.items),
});

export type ListTrashInput = z.infer<typeof ListTrashInput>;
export type PurgeItemInput = z.infer<typeof PurgeItemInput>;
export type EmptyTrashInput = z.infer<typeof EmptyTrashInput>;
