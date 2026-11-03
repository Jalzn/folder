import type { Document, DocumentSummary } from '../../domain/document-models.js';

/** Which live documents or drawings to list: one project's or every project's. Search finds by text. */
export interface ItemListQuery {
  projectId?: string | undefined;
}

export interface DocumentRepository {
  listDocuments(query: ItemListQuery): Promise<DocumentSummary[]>;
  findDocument(id: string): Promise<Document | undefined>;
  insertDocument(document: Document): Promise<void>;
  saveDocument(document: Document, expectedVersion: number): Promise<void>;
}
