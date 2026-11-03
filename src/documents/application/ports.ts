import type { ModuleContext } from '@tinyfold/core/application';
import type { IsoInstant } from '@tinyfold/core/domain';
import type { DocumentBlock } from '@tinyfold/rich-text/domain';
import type { Document, DocumentSummary } from '../domain/index.js';

/** Organization facts arrive through the server, bound to the same transaction. */
export interface DocumentOrganization {
  findProject(id: string): Promise<{ id: string; archivedAt: IsoInstant | null } | undefined>;
  findFolder(id: string): Promise<{ id: string; projectId: string; deletedAt: IsoInstant | null } | undefined>;
}

export interface DocumentOriginMetadata {
  id: string;
  title: string;
  deletedAt: IsoInstant | null;
}

export interface DocumentOriginFact extends DocumentOriginMetadata {
  content: DocumentBlock[];
  plainText: string;
}

export interface DocumentSourceInput {
  documentId: string;
  expectedVersion?: number | undefined;
  blockId?: string | null | undefined;
  excerpt: string;
}

export interface DocumentSourceFact {
  documentId: string;
  documentTitle: string;
  projectId: string;
  blockId: string | null;
  excerpt: string;
}

export interface DocumentRepository {
  listDocuments(query: { projectId?: string | undefined }): Promise<DocumentSummary[]>;
  findDocument(id: string): Promise<Document | undefined>;
  findDocumentPlacement(id: string): Promise<Pick<DocumentSummary, 'id' | 'folderId' | 'pinnedAt'> | undefined>;
  insertDocument(document: Document): Promise<void>;
  saveDocument(document: Document, expectedVersion: number): Promise<void>;
  findDocumentsForOrigins(ids: readonly string[]): Promise<Map<string, DocumentOriginFact>>;
  findDocumentMetadataForOrigins(ids: readonly string[]): Promise<Map<string, DocumentOriginMetadata>>;
  placeDocument(input: { id: string; folderId: string | null; pinnedAt: IsoInstant | null }): Promise<void>;
  moveDocument(input: { id: string; projectId: string; expectedVersion: number }): Promise<void>;
  setDocumentPinnedAt(input: { id: string; pinnedAt: IsoInstant | null }): Promise<void>;
  trashDocument(input: { id: string; at: IsoInstant; expectedVersion: number }): Promise<void>;
  restoreDocument(input: {
    id: string;
    place: { folderId: string | null; pinnedAt: IsoInstant | null };
    at: IsoInstant;
    expectedVersion: number;
  }): Promise<void>;
  /** Only the workspace purge flow calls this, after preserving the title in task sources. */
  deleteDocumentRow(id: string): Promise<void>;
}

export type DocumentsRepository = DocumentRepository & DocumentOrganization;
export type DocumentsContext = ModuleContext<DocumentsRepository>;
