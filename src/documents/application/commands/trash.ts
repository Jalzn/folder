import { assertVersion } from '#core/application';
import type { DocumentAck } from '../../domain/index.js';
import type { DeleteDocumentInput } from '../contracts/schemas.js';
import { requireDocument } from '../lookups.js';
import type { DocumentsContext } from '../ports.js';

export function deleteDocument(ctx: DocumentsContext, input: DeleteDocumentInput): Promise<DocumentAck> {
  return ctx.write('workspace.deleteDocument', input, async (repo) => {
    const document = await requireDocument(repo, input.id, true);
    assertVersion(document.version, input.expectedVersion);
    const updatedAt = ctx.now();
    await repo.trashDocument({ id: document.id, at: updatedAt, expectedVersion: document.version });
    return { id: document.id, version: document.version + 1, updatedAt };
  });
}
