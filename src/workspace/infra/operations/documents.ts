import { createDocument } from '../../application/documents/create-document.js';
import { deleteDocument } from '../../application/documents/delete-document.js';
import { getDocument } from '../../application/documents/get-document.js';
import { listDocuments } from '../../application/documents/list-documents.js';
import { restoreDocument } from '../../application/documents/restore-document.js';
import { saveDocument } from '../../application/documents/save-document.js';
import type { WorkspaceContext } from '../../application/ports/context.js';
import {
  CreateDocumentInput,
  DeleteDocumentInput,
  GetDocumentInput,
  ListDocumentsInput,
  RestoreDocumentInput,
  SaveDocumentInput,
} from '../../application/schemas/documents.js';
import { operation } from './operation.js';

export const documentOperations = (ctx: WorkspaceContext) => ({
  listDocuments: operation(ListDocumentsInput, (input) => listDocuments(ctx, input)),
  getDocument: operation(GetDocumentInput, (input) => getDocument(ctx, input)),
  createDocument: operation(CreateDocumentInput, (input) => createDocument(ctx, input)),
  saveDocument: operation(SaveDocumentInput, (input) => saveDocument(ctx, input)),
  deleteDocument: operation(DeleteDocumentInput, (input) => deleteDocument(ctx, input)),
  restoreDocument: operation(RestoreDocumentInput, (input) => restoreDocument(ctx, input)),
});
