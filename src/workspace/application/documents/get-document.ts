import type { WorkspaceContext } from '../ports/context.js';
import type { GetDocumentInput } from '../schemas/documents.js';
import { requireDocument } from './document-lookups.js';

/** Reads a trashed document too, as getCanvas does, so its editor can keep a local draft or save it as a copy. */
export function getDocument(ctx: WorkspaceContext, input: GetDocumentInput) {
  return ctx.read((repo) => requireDocument(repo, input.id, true));
}
