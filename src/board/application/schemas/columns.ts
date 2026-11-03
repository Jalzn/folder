import { edit, id, instant, request, version } from '@tinyfold/core/application';
import { z } from 'zod';
import { COLUMN_LIMITS } from '../../domain/columns.js';

/** The raw name, bounded before displayName tidies it; readName checks the rest. */
const name = z.string().max(10 * COLUMN_LIMITS.nameChars);
const completedAt = instant;

export const ListColumnsInput = z.object({});
export const CreateColumnInput = z.object({ ...request, name });
export const RenameColumnInput = z.object({ ...edit, name });
/** Places an active column before another, or at the end with null. */
export const MoveColumnInput = z.object({ ...request, id, beforeColumnId: id.nullable() });
/** Deletes a column, moving its tasks, live and trashed, to `destinationId`; an empty one needs none. */
export const DeleteColumnInput = z.object({ ...edit, destinationId: id.optional() });
/** Undoes a deletion with the list deleteColumn answered. */
export const RestoreColumnInput = z.object({
  ...edit,
  moved: z
    .array(z.object({ id, version, position: z.number().int().nonnegative(), completedAt: completedAt.nullable() }))
    .max(COLUMN_LIMITS.listedTasks),
});
/** Makes an active column the done one; `restore` gives tasks back the completions an undo lists. */
export const SetDoneColumnInput = z.object({
  ...request,
  id,
  restore: z.array(z.object({ id, completedAt })).max(COLUMN_LIMITS.listedTasks).optional(),
});

export type ListColumnsInput = z.infer<typeof ListColumnsInput>;
export type CreateColumnInput = z.infer<typeof CreateColumnInput>;
export type RenameColumnInput = z.infer<typeof RenameColumnInput>;
export type MoveColumnInput = z.infer<typeof MoveColumnInput>;
export type DeleteColumnInput = z.infer<typeof DeleteColumnInput>;
export type RestoreColumnInput = z.infer<typeof RestoreColumnInput>;
export type SetDoneColumnInput = z.infer<typeof SetDoneColumnInput>;
