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
  version: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
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

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface TaskSource {
  documentId: string;
  blockId: string | null;
  excerpt: string;
  documentTitle: string;
  available: boolean;
  blockAvailable: boolean;
}

export interface Task {
  id: string;
  title: string;
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
