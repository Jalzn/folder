import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  restoreDocument,
  saveDocument,
} from '../../application/documents.js';
import type { WorkspaceContext } from '../../application/ports.js';
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
