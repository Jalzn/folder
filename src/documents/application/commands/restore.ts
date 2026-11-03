import { assertVersion } from '#core/application';
import type { RestoreAck } from '../../domain/index.js';
import type { RestoreDocumentInput } from '../contracts/schemas.js';
import { folderAfterRestore, requireDocument } from '../lookups.js';
import type { DocumentsContext } from '../ports.js';

export function restoreDocument(ctx: DocumentsContext, input: RestoreDocumentInput): Promise<RestoreAck> {
  return ctx.write('workspace.restoreDocument', input, async (repo) => {
    const document = await requireDocument(repo, input.id, true);
    assertVersion(document.version, input.expectedVersion);
    const updatedAt = ctx.now();
    const { folderId, folderGone } = await folderAfterRestore(repo, document.folderId);
    await repo.restoreDocument({
      id: document.id,
      place: { folderId, pinnedAt: document.pinnedAt },
      at: updatedAt,
      expectedVersion: document.version,
    });
    return { id: document.id, version: document.version + 1, updatedAt, folderGone };
  });
}
