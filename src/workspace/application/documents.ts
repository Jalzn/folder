import { documentPlainText, withBlockIds } from '../domain/document.js';
import type { DocumentAck, RestoreAck } from '../domain/models.js';
import { folderAfterRestore, requireFolderInProject } from './folders/folder-rules.js';
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

/** Reads a trashed document too, as getCanvas does, so its editor can keep a local draft or save it as a copy. */
export function getDocument(ctx: WorkspaceContext, input: GetDocumentInput) {
  return ctx.read((repo) => requireDocument(repo, input.id, true));
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

/** Sends a document to the trash, unpinned. It keeps its folder, as its origin. */
export function deleteDocument(ctx: WorkspaceContext, input: DeleteDocumentInput): Promise<DocumentAck> {
  return ctx.write('workspace.deleteDocument', input, async (repo) => {
    const document = await requireDocument(repo, input.id, true);
    assertVersion(document.version, input.expectedVersion);
    const updatedAt = ctx.now();
    const version = document.version + 1;
    await repo.saveDocument(
      { ...document, deletedAt: updatedAt, pinnedAt: null, version, updatedAt },
      document.version,
    );
    return { id: document.id, version, updatedAt };
  });
}

/** Brings a document back from the trash, unpinned, into its folder, or to the root if the folder is gone. */
export function restoreDocument(ctx: WorkspaceContext, input: RestoreDocumentInput): Promise<RestoreAck> {
  return ctx.write('workspace.restoreDocument', input, async (repo) => {
    const document = await requireDocument(repo, input.id, true);
    assertVersion(document.version, input.expectedVersion);
    const updatedAt = ctx.now();
    const version = document.version + 1;
    const { folderId, folderGone } = await folderAfterRestore(repo, document.folderId);
    await repo.saveDocument({ ...document, deletedAt: null, folderId, version, updatedAt }, document.version);
    return { id: document.id, version, updatedAt, folderGone };
  });
}
