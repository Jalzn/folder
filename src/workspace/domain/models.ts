import type { ProjectColor } from './project.js';

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

/** A task as lists show it, without its description. */
export interface Task {
  id: string;
  title: string;
  projectId: string;
  /** An active column: every task, live or trashed, is in one. */
  columnId: string;
  /** Order within its project's column, from 0. */
  position: number;
  /** The fields' version: column, project, due date and labels. */
  version: number;
  /** The text's version: title and description, saved together by saveTaskText. */
  textVersion: number;
  /** A civil date, YYYY-MM-DD. */
  dueOn: string | null;
  /** Set exactly while the task is in the done column. */
  completedAt: string | null;
  /** The active labels, in alphabetical order. */
  labelIds: string[];
  /** The description's check items, or null without any. */
  checklist: { done: number; total: number } | null;
  createdAt: string;
  updatedAt: string;
  source: TaskSource | null;
}

export interface TaskList {
  tasks: Task[];
  revision: number;
}

/**
 * What a task write answers. Like every item write, it leaves out the title and the excerpt: the
 * request record keeps the answer for 30 days, and a permanent delete must not leave them there.
 */
export interface TaskAck {
  id: string;
  projectId: string;
  version: number;
  updatedAt: string;
  /** The board revision after the write. */
  revision: number;
}

/**
 * What restoring a document or drawing answers. `folderGone` says its folder was deleted meanwhile,
 * so it came back at the project's root instead.
 */
export interface RestoreAck {
  id: string;
  version: number;
  updatedAt: string;
  folderGone: boolean;
}

export interface DocumentAck {
  id: string;
  version: number;
  updatedAt: string;
}
