import { bindOperation, operation } from '@tinyfold/core/application';
import { z } from 'zod';
import { createDocument } from '../application/commands/create.js';
import { restoreDocument } from '../application/commands/restore.js';
import { saveDocument } from '../application/commands/save.js';
import { deleteDocument } from '../application/commands/trash.js';
import {
  CreateDocumentInput,
  DeleteDocumentInput,
  GetDocumentInput,
  ListDocumentsInput,
  RestoreDocumentInput,
  SaveDocumentInput,
} from '../application/contracts/schemas.js';
import type { DocumentsContext } from '../application/ports.js';
import { documentOriginFacts, getDocument, listDocuments } from '../application/queries/index.js';

export const documentOperations = (ctx: DocumentsContext) => ({
  listDocuments: operation(ListDocumentsInput, (input) => listDocuments(ctx, input)),
  getDocument: operation(GetDocumentInput, (input) => getDocument(ctx, input)),
  createDocument: operation(CreateDocumentInput, (input) => createDocument(ctx, input)),
  saveDocument: operation(SaveDocumentInput, (input) => saveDocument(ctx, input)),
  deleteDocument: operation(DeleteDocumentInput, (input) => deleteDocument(ctx, input)),
  restoreDocument: operation(RestoreDocumentInput, (input) => restoreDocument(ctx, input)),
});

export function documentApi(operations: ReturnType<typeof documentOperations>, ctx: DocumentsContext) {
  return {
    commands: {
      create: bindOperation(operations.createDocument),
      save: bindOperation(operations.saveDocument),
      trash: bindOperation(operations.deleteDocument),
      restore: bindOperation(operations.restoreDocument),
    },
    queries: {
      list: bindOperation(operations.listDocuments),
      get: bindOperation(operations.getDocument),
      factsForOrigins: bindOperation(
        operation(z.object({ ids: z.array(z.string().uuid()) }), (input) => documentOriginFacts(ctx, input)),
      ),
    },
  };
}
