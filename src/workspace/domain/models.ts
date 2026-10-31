import type { ProjectColor } from './project.js';
import type { TaskStatus } from './task-status.js';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface DocumentBlock {
  id?: string;
  type: string;
  props?: { [key: string]: JsonValue };
  content?: JsonValue;
  children?: DocumentBlock[];
}

export type DocumentContent = DocumentBlock[];

export interface Project {
  id: string;
  name: string;
  color: ProjectColor;
  /** The place in the project selector; only active projects are ordered by it. */
  position: number;
  version: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  /** Always set since every item has a project; null is still typed while the interface sends it. */
  projectId: string | null;
  plainText: string;
  formatVersion: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Document extends DocumentSummary {
  content: DocumentBlock[];
}

export type { TaskStatus };

/**
 * Where a task was created. A document deleted for good leaves `documentId` null, and the source
 * keeps the title the document had then.
 */
export interface TaskSource {
  documentId: string | null;
  blockId: string | null;
  excerpt: string;
  documentTitle: string;
  available: boolean;
  blockAvailable: boolean;
}

export interface Task {
  id: string;
  title: string;
  /** Always set since every item has a project; null is still typed while the interface sends it. */
  projectId: string | null;
  status: TaskStatus;
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  source: TaskSource | null;
}

export interface TaskList {
  tasks: Task[];
  revision: number;
}

export interface DocumentAck {
  id: string;
  version: number;
  updatedAt: string;
}
