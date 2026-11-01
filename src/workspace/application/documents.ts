import { documentPlainText, withBlockIds } from '../domain/document.js';
import type { DocumentAck } from '../domain/models.js';
import { requireFolderInProject } from './folders/folder-rules.js';
import { assertVersion, requireActiveProject, requireDocument } from './helpers.js';
import type { WorkspaceContext } from './ports.js';
import type {
  CreateDocumentInput,
  DeleteDocumentInput,
  GetDocumentInput,
  ListDocumentsInput,
  RestoreDocumentInput,
  SaveDocumentInput,
} from './schemas/documents.js';

export function listDocuments(ctx: WorkspaceContext, input: ListDocumentsInput) {
  return ctx.read((repo) => repo.listDocuments(input));
}

export function getDocument(ctx: WorkspaceContext, input: GetDocumentInput) {
  return ctx.read((repo) => requireDocument(repo, input.id));
}

/** Answers, as saving does, only the new document's id, version and date, never its title or content. */
export function createDocument(ctx: WorkspaceContext, input: CreateDocumentInput): Promise<DocumentAck> {
  return ctx.write('workspace.createDocument', input, async (repo) => {
    const project = await requireActiveProject(repo, input.projectId);
    if (input.folderId) await requireFolderInProject(repo, input.folderId, project.id);
    const now = ctx.now();
    const content = withBlockIds(input.content ?? [], () => ctx.newId());
    const document = {
      id: ctx.newId(),
      title: input.title || 'Sem título',
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
        title: input.title || 'Sem título',
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

function setDeleted(
  ctx: WorkspaceContext,
  input: DeleteDocumentInput | RestoreDocumentInput,
  deleted: boolean,
): Promise<DocumentAck> {
  return ctx.write(deleted ? 'workspace.deleteDocument' : 'workspace.restoreDocument', input, async (repo) => {
    const document = await requireDocument(repo, input.id, true);
    assertVersion(document.version, input.expectedVersion);
    const updatedAt = ctx.now();
    const version = document.version + 1;
    // Trashing unpins; restoring does not pin again.
    const pinnedAt = deleted ? null : document.pinnedAt;
    await repo.saveDocument(
      { ...document, deletedAt: deleted ? updatedAt : null, pinnedAt, version, updatedAt },
      document.version,
    );
    return { id: document.id, version, updatedAt };
  });
}

export const deleteDocument = (ctx: WorkspaceContext, input: DeleteDocumentInput) => setDeleted(ctx, input, true);
export const restoreDocument = (ctx: WorkspaceContext, input: RestoreDocumentInput) => setDeleted(ctx, input, false);
