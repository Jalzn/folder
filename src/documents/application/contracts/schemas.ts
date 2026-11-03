import { domainIssue, edit, id, request, visible } from '@tinyfold/core/application';
import { type DocumentContentOptions, readDocumentContent } from '@tinyfold/rich-text/domain';
import { z } from 'zod';

/** Empty, or of only characters that draw nothing, it becomes "Sem título". */
const title = visible(z.string().max(300));
/** Content in the document block format, checked and limited by readDocumentContent. */
const blockContent = (options: DocumentContentOptions) =>
  z.unknown().transform((value, ctx) => {
    try {
      return readDocumentContent(value, {}, options);
    } catch (error) {
      ctx.addIssue(domainIssue(error instanceof Error ? error.message : 'Documento inválido.'));
      return z.NEVER;
    }
  });
/** A document's content, which takes task and drawing embeds. */
export const documentContent = blockContent({ embeds: true });
/** A task's description: the document format without embeds. */
export const descriptionContent = blockContent({});

export const ListDocumentsInput = z.object({
  projectId: id.optional(),
});
export const GetDocumentInput = z.object({ id });
export const CreateDocumentInput = z.object({
  ...request,
  title: title.optional(),
  projectId: id,
  /** An active folder of the project; at the root without it. */
  folderId: id.optional(),
  content: documentContent.optional(),
});
/** A save never moves the document: moveItem does. A `projectId` sent anyway is dropped, as any unknown key. */
export const SaveDocumentInput = z.object({
  ...edit,
  title,
  content: documentContent,
});
export const DeleteDocumentInput = z.object(edit);
export const RestoreDocumentInput = z.object(edit);

export type ListDocumentsInput = z.infer<typeof ListDocumentsInput>;
export type GetDocumentInput = z.infer<typeof GetDocumentInput>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentInput>;
export type SaveDocumentInput = z.infer<typeof SaveDocumentInput>;
export type DeleteDocumentInput = z.infer<typeof DeleteDocumentInput>;
export type RestoreDocumentInput = z.infer<typeof RestoreDocumentInput>;
