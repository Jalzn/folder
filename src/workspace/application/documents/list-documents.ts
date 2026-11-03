import type { WorkspaceContext } from '../ports/context.js';
import type { ListDocumentsInput } from '../schemas/documents.js';

export function listDocuments(ctx: WorkspaceContext, input: ListDocumentsInput) {
  return ctx.read((repo) => repo.listDocuments(input));
}
