import type { RestoreAck } from '../../domain/items.js';
import { restoreItem } from '../items/lifecycle.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { RestoreDocumentInput } from '../schemas/documents.js';

export function restoreDocument(ctx: WorkspaceContext, input: RestoreDocumentInput): Promise<RestoreAck> {
  return ctx.write('workspace.restoreDocument', input, (repo) => restoreItem(repo, 'document', input, () => ctx.now()));
}
