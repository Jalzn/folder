import { z } from 'zod';
import { domainMessage, edit, id, request, version, visible } from '#core/application';
import { type CivilDate, isCivilDate } from '#core/domain';
import { TASK_LIMITS } from '../../domain/tasks.js';
import { descriptionContent } from './description.js';

/** A new task needs a title. */
const title = visible(z.string().min(1, domainMessage('Escreva um título.')).max(TASK_LIMITS.titleChars));
/** Saving the text: empty, or of only characters that draw nothing, it becomes "Sem título". */
const textTitle = visible(z.string().max(TASK_LIMITS.titleChars));
/** A due date, a civil date of the calendar; null clears it. */
// The refinement establishes the brand; no transform changes the RPC schema or serialized value.
const dueOn = z.string().refine(isCivilDate, domainMessage('Use uma data válida, no formato AAAA-MM-DD.')) as z.ZodType<
  CivilDate,
  string
>;
/** The labels replace the task's set; the use case checks each and the limit, with its own message. */
const labelIds = z.array(id).max(5 * TASK_LIMITS.labels);

export const ListTasksInput = z.object({ projectId: id.optional(), documentId: id.optional() });
/** A task, live or in the trash, with its description. */
export const GetTaskInput = z.object({ id });
/*
 * The task writes refuse a key they do not know (strictObject), where the other aggregates' inputs
 * drop it: after B6 a tab from before still sends `status` and updateTask's `title`, and dropping them
 * answered its complete or rename as if done. A refusal shows it an error instead.
 */
/**
 * A task needs a project, unless it comes from a document excerpt: with no project, or null, it
 * joins the document's project. A copy ("Salvar como cópia") brings its fields and description.
 */
export const CreateTaskInput = z
  .strictObject({
    ...request,
    title,
    projectId: id.nullable().optional(),
    /** An active column; the first open one when left out. */
    columnId: id.optional(),
    dueOn: dueOn.nullable().optional(),
    labelIds: labelIds.optional(),
    description: descriptionContent.optional(),
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
    message: domainMessage('Escolha o projeto da tarefa.'),
    path: ['projectId'],
  });
/** The fields, at the fields' version: column, project, due date and labels. The title is text. */
export const UpdateTaskInput = z.strictObject({
  ...edit,
  projectId: id.optional(),
  columnId: id.optional(),
  dueOn: dueOn.nullable().optional(),
  labelIds: labelIds.optional(),
});
/** The text, at the text's version: the title and the description together. */
export const SaveTaskTextInput = z.strictObject({
  ...request,
  id,
  expectedTextVersion: version,
  title: textTitle,
  description: descriptionContent,
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
export const MoveTaskInput = z.strictObject({
  ...edit,
  expectedRevision: z.number().int().nonnegative().optional(),
  columnId: id,
  beforeTaskId: id.nullable().optional(),
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
