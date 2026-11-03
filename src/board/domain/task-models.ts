import type { CivilDate, IsoInstant } from '#core/domain';
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
  dueOn: CivilDate | null;
  /** Set exactly while the task is in the done column. */
  completedAt: IsoInstant | null;
  /** The active labels, in alphabetical order. */
  labelIds: string[];
  /** The description's check items, or null without any. */
  checklist: { done: number; total: number } | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
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
  updatedAt: IsoInstant;
  /** The board revision after the write. */
  revision: number;
}
