import { assertVersion } from '#core/application';
import { documentPlainText, withBlockIds } from '#rich-text/domain';
import type { DocumentAck } from '../../domain/index.js';
import type { SaveDocumentInput } from '../contracts/schemas.js';
import { requireDocument } from '../lookups.js';
import type { DocumentsContext } from '../ports.js';

const titleOrUntitled = (title: string | undefined): string => title || 'Sem título';

export function saveDocument(ctx: DocumentsContext, input: SaveDocumentInput): Promise<DocumentAck> {
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
