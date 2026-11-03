import { searchText } from '@tinyfold/core/domain';
import type { DocumentBlock } from '@tinyfold/rich-text/domain';
import type { Document, DocumentSummary } from '../../domain/index.js';
import type { DocumentRow } from './table.js';

export const documentSummary = (row: Omit<DocumentRow, 'content' | 'search_text'>): DocumentSummary => ({
  id: row.id,
  title: row.title,
  projectId: row.project_id,
  plainText: row.plain_text,
  formatVersion: row.format_version,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  pinnedAt: row.pinned_at,
  folderId: row.folder_id,
});

export const documentModel = (row: DocumentRow): Document => ({
  ...documentSummary(row),
  content: JSON.parse(row.content) as DocumentBlock[],
});

export const documentRow = (document: Document): DocumentRow => ({
  id: document.id,
  project_id: document.projectId,
  title: document.title,
  content: JSON.stringify(document.content),
  plain_text: document.plainText,
  search_text: searchText(`${document.title}\n${document.plainText}`),
  format_version: document.formatVersion,
  version: document.version,
  created_at: document.createdAt,
  updated_at: document.updatedAt,
  deleted_at: document.deletedAt,
  pinned_at: document.pinnedAt,
  folder_id: document.folderId,
});
