import { documentPlainText, withBlockIds } from '../../domain/document.js';
import type { DocumentAck } from '../../domain/items.js';
import { titleOrUntitled } from '../../domain/text.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { SaveDocumentInput } from '../schemas/documents.js';
import { assertVersion } from '../version.js';
import { requireDocument } from './document-lookups.js';

export function saveDocument(ctx: WorkspaceContext, input: SaveDocumentInput): Promise<DocumentAck> {
  const plainText = documentPlainText(input.content);
  return ctx.write('workspace.saveDocument', input, async (repo) => {
    const document = await requireDocument(repo, input.id);
    assertVersion(document.version, input.expectedVersion);
    const updatedAt = ctx.now();
    const version = document.version + 1;
    await repo.saveDocument(
      {
        ...document,
        title: titleOrUntitled(input.title),
        content: withBlockIds(input.content, () => ctx.newId()),
        plainText,
        version,
        updatedAt,
      },
      document.version,
    );
    return { id: document.id, version, updatedAt };
  });
}
