import { id, request, version } from '@tinyfold/core/application';
import { z } from 'zod';
import { NAV_ITEM_TYPES } from '../../domain/navigation.js';

/**
 * Moves a document or drawing to another project, at the version the caller saw, or files it in a
 * folder of its project (null is the root), with no version.
 */
export const MoveItemInput = z.object({
  ...request,
  type: z.enum(NAV_ITEM_TYPES),
  id,
  projectId: id,
  folderId: id.nullable().optional(),
  expectedVersion: version.optional(),
});

export type MoveItemInput = z.infer<typeof MoveItemInput>;
