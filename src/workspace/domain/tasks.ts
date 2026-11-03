import type { DocumentContent } from './document-models.js';
import type { Task } from './task-models.js';

export type { Task };

/** A task with its description, as the drawer opens it, live or in the trash. */
export interface TaskDetail extends Task {
  description: DocumentContent;
  deletedAt: string | null;
}

/** Bounds of a task: its title and its labels. The description has the document's limits. */
export const TASK_LIMITS = { titleChars: 300, labels: 20 } as const;

/** What saving a task's text answers, without the text (see TaskAck). */
export interface TaskTextAck {
  id: string;
  textVersion: number;
  updatedAt: string;
}
