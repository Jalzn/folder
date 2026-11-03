import type { JsonValue } from './json.js';

export interface DocumentBlock {
  id?: string;
  type: string;
  props?: { [key: string]: JsonValue };
  content?: JsonValue;
  children?: DocumentBlock[];
}

export type DocumentContent = DocumentBlock[];

export interface DocumentSummary {
  id: string;
  title: string;
  projectId: string;
  plainText: string;
  formatVersion: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** When it was pinned at the top of its sidebar section; moving it or trashing it unpins it. */
  pinnedAt: string | null;
  /** The folder it is in, or null at the project's root. A trashed item keeps it as its origin. */
  folderId: string | null;
}

export interface Document extends DocumentSummary {
  content: DocumentBlock[];
}
