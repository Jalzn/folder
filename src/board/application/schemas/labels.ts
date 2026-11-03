import { edit, request } from '@tinyfold/core/application';
import { z } from 'zod';
import { LABEL_COLORS, LABEL_LIMITS } from '../../domain/labels.js';

/** The raw name, bounded before displayName tidies it; readName checks the rest. */
const name = z.string().max(10 * LABEL_LIMITS.nameChars);
const color = z.enum(LABEL_COLORS);

export const ListLabelsInput = z.object({});
/** Without a color, the first no active label uses. */
export const CreateLabelInput = z.object({ ...request, name, color: color.optional() });
export const UpdateLabelInput = z.object({ ...edit, name: name.optional(), color: color.optional() });
export const DeleteLabelInput = z.object(edit);
export const RestoreLabelInput = z.object(edit);

export type ListLabelsInput = z.infer<typeof ListLabelsInput>;
export type CreateLabelInput = z.infer<typeof CreateLabelInput>;
export type UpdateLabelInput = z.infer<typeof UpdateLabelInput>;
export type DeleteLabelInput = z.infer<typeof DeleteLabelInput>;
export type RestoreLabelInput = z.infer<typeof RestoreLabelInput>;
