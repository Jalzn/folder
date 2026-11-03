import { AppError, assertVersion } from '@tinyfold/core/application';
import { excerptPresent } from '@tinyfold/rich-text/domain';
import type { Document } from '../domain/index.js';
import type { DocumentOrganization, DocumentRepository, DocumentSourceFact, DocumentSourceInput } from './ports.js';

export async function requireDocument(
  repository: Pick<DocumentRepository, 'findDocument'>,
  id: string,
  includeDeleted = false,
): Promise<Document> {
  const document = await repository.findDocument(id);
  if (!document || (!includeDeleted && document.deletedAt))
    throw new AppError('NOT_FOUND', 'O documento não está disponível.');
  return document;
}

export async function requireActiveProject(organization: DocumentOrganization, id: string) {
  const project = await organization.findProject(id);
  if (!project) throw new AppError('NOT_FOUND', 'O projeto não foi encontrado.');
  if (project.archivedAt) throw new AppError('DOMAIN_RULE', 'Desarquive o projeto antes de adicionar conteúdo a ele.');
  return project;
}

export async function requireFolderInProject(organization: DocumentOrganization, id: string, projectId: string) {
  const folder = await organization.findFolder(id);
  if (!folder || folder.deletedAt) throw new AppError('NOT_FOUND', 'A pasta não está disponível.');
  if (folder.projectId !== projectId) throw new AppError('VALIDATION', 'A pasta não é deste projeto.');
  return folder;
}

export async function folderAfterRestore(organization: DocumentOrganization, folderId: string | null) {
  if (folderId === null) return { folderId, folderGone: false };
  const folder = await organization.findFolder(folderId);
  return folder && !folder.deletedAt ? { folderId, folderGone: false } : { folderId: null, folderGone: true };
}

/** Captures origin facts while the outer create-task transaction still owns the read. */
export async function requireDocumentSource(
  repository: Pick<DocumentRepository, 'findDocument'>,
  input: DocumentSourceInput,
): Promise<DocumentSourceFact> {
  const document = await requireDocument(repository, input.documentId);
  if (input.expectedVersion !== undefined) assertVersion(document.version, input.expectedVersion);
  const blockId = input.blockId ?? null;
  if (!excerptPresent(document, blockId, input.excerpt))
    throw new AppError(
      'VERSION_CONFLICT',
      'O trecho de origem mudou. Salve o documento e selecione o trecho novamente.',
    );
  return {
    documentId: document.id,
    documentTitle: document.title,
    projectId: document.projectId,
    blockId,
    excerpt: input.excerpt,
  };
}
