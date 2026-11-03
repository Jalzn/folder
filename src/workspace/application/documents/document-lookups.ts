import type { Document } from '../../domain/document-models.js';
import { workspaceErrors } from '../errors.js';
import type { WorkspaceRepository } from '../ports/context.js';

export async function requireDocument(
  repo: WorkspaceRepository,
  id: string,
  includeDeleted = false,
): Promise<Document> {
  const document = await repo.findDocument(id);
  if (!document || (!includeDeleted && document.deletedAt)) throw workspaceErrors.documentMissing();
  return document;
}
