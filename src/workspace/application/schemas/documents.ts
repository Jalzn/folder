import { z } from 'zod';
import { readDocumentContent } from '../../domain/document.js';
import { edit, id, request, visible } from './common.js';

/** Empty, or of only characters that draw nothing, it becomes "Sem título". */
const title = visible(z.string().max(300));
const content = z.unknown().transform((value, ctx) => {
  try {
    return readDocumentContent(value);
  } catch (error) {
    ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Documento inválido.' });
    return z.NEVER;
  }
});

export const ListDocumentsInput = z.object({
  projectId: id.optional(),
  query: z.string().max(300).optional(),
  deleted: z.boolean().optional(),
});
export const GetDocumentInput = z.object({ id });
export const CreateDocumentInput = z.object({
  ...request,
  title: title.optional(),
  projectId: id,
  /** An active folder of the project; at the root without it. */
  folderId: id.optional(),
  content: content.optional(),
});
/** A save never moves the document: moveItem does. A `projectId` sent anyway is dropped, as any unknown key. */
export const SaveDocumentInput = z.object({
  ...edit,
  title,
  content,
});
export const DeleteDocumentInput = z.object(edit);
export const RestoreDocumentInput = z.object(edit);

export type ListDocumentsInput = z.infer<typeof ListDocumentsInput>;
export type GetDocumentInput = z.infer<typeof GetDocumentInput>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentInput>;
export type SaveDocumentInput = z.infer<typeof SaveDocumentInput>;
export type DeleteDocumentInput = z.infer<typeof DeleteDocumentInput>;
export type RestoreDocumentInput = z.infer<typeof RestoreDocumentInput>;
