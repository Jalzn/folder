import type { CivilDate, IsoInstant } from '#core/domain';
import type { DocumentBlock } from '#rich-text/domain';
import type { LabelColor } from '../../domain/labels.js';
import type { BoardKey } from '../../domain/paging.js';
import type { TaskSource } from '../../domain/task-models.js';
export interface TaskColumn {
  id: string;
  name: string;
  isDone: boolean;
}
export interface TaskLabel {
  id: string;
  name: string;
  color: LabelColor;
}
export interface ProjectReference {
  projectId: string;
  projectName: string;
  projectArchived: boolean;
}
export interface Page<T> {
  items: T[];
  hasMore: boolean;
}
export interface TaskQuery {
  projectId: string | undefined;
  documentId: string | undefined;
  /** Only tasks in any of these columns. */
  columnIds: readonly string[] | undefined;
  /** Only tasks with all of these labels. */
  labelIds: readonly string[] | undefined;
  /** Normalized words from searchTerms, all required in the title. */
  terms: readonly string[];
  limit: number;
  /** The key of the last task of the previous page. */
  after: BoardKey | undefined;
}

/**
 * Where a task came from, as agents see it: a live document with its title; a trashed one without,
 * as if missing; and one deleted for good, with a null ID and the title it had then.
 */
export interface SourceDocument {
  documentId: string | null;
  documentTitle: string | null;
  available: boolean;
}

export interface TaskListing extends ProjectReference {
  id: string;
  title: string;
  column: TaskColumn;
  /** The position of the task's column among the active ones, which orders the board. */
  columnPosition: number;
  position: number;
  dueOn: CivilDate | null;
  completedAt: IsoInstant | null;
  /** The active labels, in alphabetical order. */
  labels: TaskLabel[];
  checklist: { done: number; total: number } | null;
  updatedAt: IsoInstant;
  source: SourceDocument | null;
}

export interface TaskForReading extends Omit<TaskListing, 'source'> {
  createdAt: IsoInstant;
  version: number;
  textVersion: number;
  description: DocumentBlock[];
  source: (Omit<TaskSource, keyof SourceDocument> & SourceDocument) | null;
}
