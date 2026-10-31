import { z } from 'zod';
import { TASK_STATUSES } from '../../domain/task-status.js';
import { edit, id, projectId, request, version } from './common.js';

const title = z.string().trim().min(1, 'Escreva um título.').max(300);
const status = z.enum(TASK_STATUSES);

export const ListTasksInput = z.object({ projectId: projectId.optional(), documentId: id.optional() });
/** A task needs a project, unless it comes from a document excerpt and so joins the document's project. */
export const CreateTaskInput = z
  .object({
    ...request,
    title,
    projectId: projectId.optional(),
    status: status.optional(),
    source: z
      .object({
        documentId: id,
        blockId: z.string().min(1).max(128).nullable().optional(),
        excerpt: z.string().trim().min(1).max(4000),
        expectedVersion: version.optional(),
      })
      .optional(),
  })
  .refine((input) => input.projectId !== undefined || input.source !== undefined, {
    message: 'Escolha o projeto da tarefa.',
    path: ['projectId'],
  });
export const UpdateTaskInput = z.object({
  ...edit,
  title: title.optional(),
  projectId: projectId.optional(),
  status: status.optional(),
});
export const DeleteTaskInput = z.object(edit);
export const RestoreTaskInput = z.object(edit);
export const MoveTaskInput = z.object({
  ...edit,
  expectedRevision: z.number().int().nonnegative(),
  status,
  beforeTaskId: id.nullable().optional(),
});

export type ListTasksInput = z.infer<typeof ListTasksInput>;
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskInput>;
export type RestoreTaskInput = z.infer<typeof RestoreTaskInput>;
export type MoveTaskInput = z.infer<typeof MoveTaskInput>;
