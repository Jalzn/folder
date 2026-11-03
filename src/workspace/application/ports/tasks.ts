import type { DocumentContent } from '../../domain/document-models.js';
import type { CompletedKey } from '../../domain/paging.js';
import type { Task, TaskSource } from '../../domain/task-models.js';
import type { TaskDetail } from '../../domain/tasks.js';

/** A task as stored, live or trashed, with its description and without its labels or source. */
export interface TaskRecord {
  id: string;
  title: string;
  projectId: string;
  columnId: string;
  position: number;
  dueOn: string | null;
  completedAt: string | null;
  description: DocumentContent;
  descriptionPlainText: string;
  checklistDone: number;
  checklistTotal: number;
  version: number;
  textVersion: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** A new task's source, which keeps the document's title for when the document is deleted for good. */
export interface TaskSourceRecord extends Pick<TaskSource, 'blockId' | 'excerpt' | 'documentTitle'> {
  taskId: string;
  documentId: string;
}

export interface TaskListQuery {
  projectId?: string | undefined;
  /** Only tasks created from this document. */
  documentId?: string | undefined;
}

export interface TaskRepository {
  listTasks(query: TaskListQuery): Promise<Task[]>;
  findTask(id: string): Promise<TaskRecord | undefined>;
  /** A task, live or trashed, as the drawer opens it: with its labels, source and description. */
  taskDetail(id: string): Promise<TaskDetail | undefined>;
  insertTask(task: TaskRecord): Promise<void>;
  /**
   * Writes the fields only (project, column, position, due date, completion, trash, version and
   * update date) at the expected version, so it never overwrites the text.
   */
  saveTaskFields(task: TaskRecord, expectedVersion: number): Promise<void>;
  /**
   * Writes the text only (title, description and what derives from them, text version and update
   * date) at the expected text version, so it never overwrites the fields.
   */
  saveTaskText(task: TaskRecord, expectedTextVersion: number): Promise<void>;
  insertSource(source: TaskSourceRecord): Promise<void>;
  /** After the last of one project's live tasks in a column. */
  nextPosition(input: { projectId: string; columnId: string }): Promise<number>;
  /** One project's live tasks of a column, in board order. */
  tasksInColumn(input: { projectId: string; columnId: string }): Promise<TaskRecord[]>;
  /** Moves a task within its column. The order is not an edit: version and dates stay. */
  setTaskPosition(id: string, position: number): Promise<void>;
  /** One project's live tasks in the open columns, and those completed since `doneSince`, in board order. */
  boardTasks(input: { projectId: string; doneSince: string }): Promise<Task[]>;
  /** How many of one project's live tasks were completed before `doneSince`. */
  olderDoneCount(input: { projectId: string; doneSince: string }): Promise<number>;
  /** One project's live completed tasks after `after`, the most recently completed first. */
  completedTasks(projectId: string, after: CompletedKey | undefined, limit: number): Promise<Task[]>;
  completedCount(projectId: string): Promise<number>;
  /** Live tasks due before `today` outside the done column, per project. */
  overdueCounts(today: string): Promise<Map<string, number>>;
  /** The task's labels, deleted ones included, which keep their links. */
  taskLabelIds(taskId: string): Promise<string[]>;
  /** Replaces the task's links to active labels; links to deleted ones stay. */
  setTaskLabels(taskId: string, labelIds: readonly string[]): Promise<void>;
}
