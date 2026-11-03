import { edit, id, request, visible } from '@tinyfold/core/application';
import { z } from 'zod';
import { PROJECT_COLORS } from '../../domain/project.js';

const name = visible(z.string().min(1).max(100));
const color = z.enum(PROJECT_COLORS);

export const ListProjectsInput = z.object({ includeArchived: z.boolean().optional() });
export const CreateProjectInput = z.object({ ...request, name, color: color.optional() });
export const UpdateProjectInput = z.object({
  ...edit,
  name: name.optional(),
  color: color.optional(),
  archived: z.boolean().optional(),
});
/** Places an active project before another in the selector, or at its end with null. */
export const MoveProjectInput = z.object({ ...request, id, beforeProjectId: id.nullable() });

export type ListProjectsInput = z.infer<typeof ListProjectsInput>;
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;
export type MoveProjectInput = z.infer<typeof MoveProjectInput>;
