import { z } from 'zod';
import { edit, request } from './common.js';

const name = z.string().trim().min(1).max(100);

export const ListProjectsInput = z.object({ includeArchived: z.boolean().optional() });
export const CreateProjectInput = z.object({ ...request, name });
export const UpdateProjectInput = z.object({
  ...edit,
  name: name.optional(),
  archived: z.boolean().optional(),
});

export type ListProjectsInput = z.infer<typeof ListProjectsInput>;
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;
