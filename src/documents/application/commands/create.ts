import { documentPlainText, withBlockIds } from '#rich-text/domain';
import type { DocumentAck } from '../../domain/index.js';

import type { CreateDocumentInput } from '../contracts/schemas.js';
import { requireActiveProject, requireFolderInProject } from '../lookups.js';
import type { DocumentsContext } from '../ports.js';

const titleOrUntitled = (title: string | undefined): string => title || 'Sem título';

/** Answers, as saving does, only the new document's id, version and date, never its title or content. */
export function createDocument(ctx: DocumentsContext, input: CreateDocumentInput): Promise<DocumentAck> {
  return ctx.write('workspace.createDocument', input, async (repo) => {
    const project = await requireActiveProject(repo, input.projectId);
    if (input.folderId) await requireFolderInProject(repo, input.folderId, project.id);
    const now = ctx.now();
    const content = withBlockIds(input.content ?? [], () => ctx.newId());
    const document = {
      id: ctx.newId(),
      title: titleOrUntitled(input.title),
      projectId: project.id,
      content,
      plainText: documentPlainText(content),
      formatVersion: 1,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      pinnedAt: null,
      folderId: input.folderId ?? null,
    };
    await repo.insertDocument(document);
    return { id: document.id, version: document.version, updatedAt: document.updatedAt };
  });
}
