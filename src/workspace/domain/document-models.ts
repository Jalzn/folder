import type { FiledItem } from './items.js';
import type { JsonValue } from './json.js';

export interface DocumentBlock {
  id?: string;
  type: string;
  props?: { [key: string]: JsonValue };
  content?: JsonValue;
  children?: DocumentBlock[];
}

export type DocumentContent = DocumentBlock[];

export interface DocumentSummary extends FiledItem {
  title: string;
  plainText: string;
  formatVersion: number;
  createdAt: string;
  updatedAt: string;
  /** The folder it is in, or null at the project's root. A trashed item keeps it as its origin. */
}

export interface Document extends DocumentSummary {
  content: DocumentBlock[];
}
