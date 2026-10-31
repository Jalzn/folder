import { z } from 'zod';
import { readDocumentContent } from '../../domain/document.js';
import { edit, id, projectId, request } from './common.js';

const content = z.unknown().transform((value, ctx) => {
  try {
    return readDocumentContent(value);
  } catch (error) {
    ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Documento inválido.' });
    return z.NEVER;
  }
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

export type ListDocumentsInput = z.infer<typeof ListDocumentsInput>;
export type GetDocumentInput = z.infer<typeof GetDocumentInput>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentInput>;
export type SaveDocumentInput = z.infer<typeof SaveDocumentInput>;
export type DeleteDocumentInput = z.infer<typeof DeleteDocumentInput>;
export type RestoreDocumentInput = z.infer<typeof RestoreDocumentInput>;
