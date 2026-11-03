import type { GetDocumentInput, ListDocumentsInput } from '../contracts/schemas.js';
import { requireDocument } from '../lookups.js';
import type { DocumentsContext } from '../ports.js';

export const listDocuments = (ctx: DocumentsContext, input: ListDocumentsInput) =>
  ctx.read((repository) => repository.listDocuments(input));

/** A trashed document remains readable so the editor can recover a local draft. */
export const getDocument = (ctx: DocumentsContext, input: GetDocumentInput) =>
  ctx.read((repository) => requireDocument(repository, input.id, true));

export const documentOriginFacts = (ctx: DocumentsContext, input: { ids: string[] }) =>
  ctx.read((repository) => repository.findDocumentsForOrigins(input.ids));
