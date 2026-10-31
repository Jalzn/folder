import { z } from 'zod';
import { NAV_ITEM_TYPES } from '../../domain/navigation.js';
import { edit, id } from './common.js';

/** Moves a document or drawing to another project, at the version the caller saw. */
export const MoveItemInput = z.object({ ...edit, type: z.enum(NAV_ITEM_TYPES), projectId: id });

export type MoveItemInput = z.infer<typeof MoveItemInput>;
