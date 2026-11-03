import type { DocumentAck } from '../../domain/items.js';
import { trashItem } from '../items/lifecycle.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { DeleteDocumentInput } from '../schemas/documents.js';
export function deleteDocument(ctx: WorkspaceContext, input: DeleteDocumentInput): Promise<DocumentAck> {
  return ctx.write('workspace.deleteDocument', input, (repo) => trashItem(repo, 'document', input, () => ctx.now()));
}
