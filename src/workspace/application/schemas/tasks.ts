import { z } from 'zod';
import { TASK_STATUSES } from '../../domain/task-status.js';
import { edit, id, request, version, visible } from './common.js';

const title = visible(z.string().min(1, 'Escreva um título.').max(300));
/** Until B6: the status of stage 09, which the interface of that stage sends for a column. */
const status = z.enum(TASK_STATUSES);

export const ListTasksInput = z.object({ projectId: id.optional(), documentId: id.optional() });
/**
 * A task needs a project, unless it comes from a document excerpt: with no project, or null, it
 * joins the document's project.
 */
export const CreateTaskInput = z
  .object({
    ...request,
    title,
    projectId: id.nullable().optional(),
    /** An active column; the first open one when left out. */
    columnId: id.optional(),
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
  .refine((input) => typeof input.projectId === 'string' || input.source !== undefined, {
    message: 'Escolha o projeto da tarefa.',
    path: ['projectId'],
  });
export const UpdateTaskInput = z.object({
  ...edit,
  /** Until B6: the interface of stage 09 renames a task here. */
  title: title.optional(),
  projectId: id.optional(),
  columnId: id.optional(),
  status: status.optional(),
});
export const DeleteTaskInput = z.object(edit);
export const RestoreTaskInput = z.object(edit);
export const MoveTaskInput = z
  .object({
    ...edit,
    expectedRevision: z.number().int().nonnegative(),
    columnId: id.optional(),
    status: status.optional(),
    beforeTaskId: id.nullable().optional(),
  })
  .refine((input) => input.columnId !== undefined || input.status !== undefined, {
    message: 'Escolha a coluna.',
    path: ['columnId'],
  });

export type ListTasksInput = z.infer<typeof ListTasksInput>;
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskInput>;
export type RestoreTaskInput = z.infer<typeof RestoreTaskInput>;
export type MoveTaskInput = z.infer<typeof MoveTaskInput>;
