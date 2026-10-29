import { z } from 'zod';
import { readDocumentContent } from '../domain/document.js';

const id = z.string().uuid();
const version = z.number().int().positive();
const request = { requestId: id };
const edit = { ...request, id, expectedVersion: version };
const title = z.string().trim().min(1, 'Escreva um título.').max(300);
const projectId = id.nullable();
const status = z.enum(['todo', 'doing', 'done']);

const content = z.unknown().transform((value, ctx) => {
  try {
    return readDocumentContent(value);
  } catch (error) {
    ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Documento inválido.' });
    return z.NEVER;
  }
});

export const ListProjectsInput = z.object({ includeArchived: z.boolean().optional() });
export const CreateProjectInput = z.object({ ...request, name: z.string().trim().min(1).max(100) });
export const UpdateProjectInput = z.object({
  ...edit,
  name: z.string().trim().min(1).max(100).optional(),
  archived: z.boolean().optional(),
});
export const ListDocumentsInput = z.object({
  projectId: projectId.optional(),
  query: z.string().max(300).optional(),
  deleted: z.boolean().optional(),
});
export const GetDocumentInput = z.object({ id });
export const CreateDocumentInput = z.object({
  ...request,
  title: z.string().trim().max(300).optional(),
  projectId: projectId.optional(),
  content: content.optional(),
});
export const SaveDocumentInput = z.object({
  ...edit,
  title: z.string().trim().max(300),
  content,
  projectId: projectId.optional(),
});
export const DeleteDocumentInput = z.object(edit);
export const RestoreDocumentInput = z.object(edit);
export const ListTasksInput = z.object({ projectId: projectId.optional(), documentId: id.optional() });
export const CreateTaskInput = z.object({
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
});
export const UpdateTaskInput = z.object({
  ...edit,
  title: title.optional(),
  projectId: projectId.optional(),
  status: status.optional(),
});
export const DeleteTaskInput = z.object(edit);
export const MoveTaskInput = z.object({
  ...edit,
  expectedRevision: z.number().int().nonnegative(),
  status,
  beforeTaskId: id.nullable().optional(),
});

export type ListProjectsInput = z.infer<typeof ListProjectsInput>;
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;
export type ListDocumentsInput = z.infer<typeof ListDocumentsInput>;
export type GetDocumentInput = z.infer<typeof GetDocumentInput>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentInput>;
export type SaveDocumentInput = z.infer<typeof SaveDocumentInput>;
export type DeleteDocumentInput = z.infer<typeof DeleteDocumentInput>;
export type RestoreDocumentInput = z.infer<typeof RestoreDocumentInput>;
export type ListTasksInput = z.infer<typeof ListTasksInput>;
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskInput>;
export type MoveTaskInput = z.infer<typeof MoveTaskInput>;
