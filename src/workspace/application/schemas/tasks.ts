import { isCivilDate } from '@tinyfold/core/domain';
import { z } from 'zod';
import { TASK_STATUSES } from '../../domain/task-status.js';
import { TASK_LIMITS } from '../../domain/tasks.js';
import { edit, id, request, version, visible } from './common.js';
import { documentContent } from './documents.js';

/** A new task needs a title. */
const title = visible(z.string().min(1, 'Escreva um título.').max(TASK_LIMITS.titleChars));
/** Saving the text: empty, or of only characters that draw nothing, it becomes "Sem título". */
const textTitle = visible(z.string().max(TASK_LIMITS.titleChars));
/** Until B6: the status of stage 09, which the interface of that stage sends for a column. */
const status = z.enum(TASK_STATUSES);
/** A due date, a civil date of the calendar; null clears it. */
const dueOn = z.string().refine(isCivilDate, 'Use uma data válida, no formato AAAA-MM-DD.');
/** The labels replace the task's set; the use case checks each and the limit, with its own message. */
const labelIds = z.array(id).max(5 * TASK_LIMITS.labels);

export const ListTasksInput = z.object({ projectId: id.optional(), documentId: id.optional() });
/** A task, live or in the trash, with its description. */
export const GetTaskInput = z.object({ id });
/**
 * A task needs a project, unless it comes from a document excerpt: with no project, or null, it
 * joins the document's project. A copy ("Salvar como cópia") brings its fields and description.
 */
export const CreateTaskInput = z
  .object({
    ...request,
    title,
    projectId: id.nullable().optional(),
    /** An active column; the first open one when left out. */
    columnId: id.optional(),
    status: status.optional(),
    dueOn: dueOn.nullable().optional(),
    labelIds: labelIds.optional(),
    description: documentContent.optional(),
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
/** The fields, at the fields' version: column, project, due date and labels. */
export const UpdateTaskInput = z.object({
  ...edit,
  /** Until B6: the interface of stage 09 renames a task here. */
  title: title.optional(),
  projectId: id.optional(),
  columnId: id.optional(),
  status: status.optional(),
  dueOn: dueOn.nullable().optional(),
  labelIds: labelIds.optional(),
});
/** The text, at the text's version: the title and the description together. */
export const SaveTaskTextInput = z.object({
  ...request,
  id,
  expectedTextVersion: version,
  title: textTitle,
  description: documentContent,
});
/** One project's board: its open tasks and those completed in the done window. */
export const ProjectBoardInput = z.object({ projectId: id });
/** One project's completed tasks, the most recent first, by pages. */
export const ListCompletedTasksInput = z.object({
  projectId: id,
  cursor: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export const DeleteTaskInput = z.object(edit);
export const RestoreTaskInput = z.object(edit);
/**
 * Moves a task within its project's board. With `expectedRevision`, the board must not have changed;
 * without it, only for an undo, the place is `beforeTaskId`, or the end once that task left.
 */
export const MoveTaskInput = z
  .object({
    ...edit,
    expectedRevision: z.number().int().nonnegative().optional(),
    columnId: id.optional(),
    status: status.optional(),
    beforeTaskId: id.nullable().optional(),
  })
  .refine((input) => input.columnId !== undefined || input.status !== undefined, {
    message: 'Escolha a coluna.',
    path: ['columnId'],
  });

export type ListTasksInput = z.infer<typeof ListTasksInput>;
export type GetTaskInput = z.infer<typeof GetTaskInput>;
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;
export type SaveTaskTextInput = z.infer<typeof SaveTaskTextInput>;
export type ProjectBoardInput = z.infer<typeof ProjectBoardInput>;
export type ListCompletedTasksInput = z.infer<typeof ListCompletedTasksInput>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskInput>;
export type RestoreTaskInput = z.infer<typeof RestoreTaskInput>;
export type MoveTaskInput = z.infer<typeof MoveTaskInput>;
