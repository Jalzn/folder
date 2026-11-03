import type { CivilDate, IsoInstant } from '@tinyfold/core/domain';
import type { CanvasScene } from '../../domain/canvas/index.js';
import type { DocumentBlock } from '../../domain/document-models.js';
import type { LabelColor } from '../../domain/labels.js';
import type { BoardKey, ProjectKey, SearchItemType, SearchKey } from '../../domain/paging.js';
import type { ProjectColor } from '../../domain/project.js';
import type { TaskSource } from '../../domain/task-models.js';

/** A task's column as agents see it. */
export interface TaskColumn {
  id: string;
  name: string;
  isDone: boolean;
}

/** A task's active label as agents see it. */
export interface TaskLabel {
  id: string;
  name: string;
  color: LabelColor;
}

/** The folder a document or drawing is in. */
export interface FolderReference {
  id: string;
  name: string;
}

/** A project's active folder as list_projects shows it, with its live documents and drawings counted. */
export interface FolderWithCount extends FolderReference {
  items: number;
}

export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

export interface ItemCounts {
  documents: number;
  drawings: number;
  /** Tasks outside the done column. */
  openTasks: number;
}

export interface ProjectQuery {
  includeArchived: boolean;
  limit: number;
  /** The key of the last project of the previous page. */
  after: ProjectKey | undefined;
}

export interface ProjectWithCounts extends ItemCounts {
  id: string;
  name: string;
  color: ProjectColor;
  /** The place in the project selector; null for an archived project, which has none. */
  position: number | null;
  archived: boolean;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  /** Every active folder of the project. */
  folderCount: number;
  /** The first active folders, in the sidebar's order, at most READING_LIMITS.projectFolders. */
  folders: FolderWithCount[];
}

/** The project every item belongs to. */
export interface ProjectReference {
  projectId: string;
  projectName: string;
  projectArchived: boolean;
}

export interface SearchQuery {
  /** Normalized words from searchTerms, all required; none lists recent items. */
  terms: readonly string[];
  projectId: string | undefined;
  /** Only documents and drawings in this active folder. */
  folderId: string | undefined;
  types: readonly SearchItemType[];
  limit: number;
  /** The key of the last item of the previous page. */
  after: SearchKey | undefined;
}

export type SearchHit = ProjectReference & {
  id: string;
  title: string;
  updatedAt: IsoInstant;
  /** How many query words the title lacks; it orders the results and is not shown. */
  titleRank: number;
} & (
    | {
        type: 'document' | 'drawing';
        excerpt: string;
        /** Pinned at the top of its section in the project's sidebar. */
        pinned: boolean;
        /** The folder it is in, or null at the project's root. */
        folder: FolderReference | null;
      }
    | {
        type: 'task';
        column: TaskColumn;
        excerpt: string;
      }
  );

export interface DocumentForReading extends ProjectReference {
  id: string;
  title: string;
  /** The folder it is in, or null at the project's root. */
  folder: FolderReference | null;
  content: DocumentBlock[];
  version: number;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface OriginTask {
  id: string;
  title: string;
  /** The name of its column. */
  column: string;
}

export interface CanvasForReading extends ProjectReference {
  id: string;
  title: string;
  /** The folder it is in, or null at the project's root. */
  folder: FolderReference | null;
  scene: CanvasScene;
  version: number;
  updatedAt: IsoInstant;
  preview: StoredPreview | null;
}

export interface StoredPreview {
  sceneVersion: number;
  /** Null for previews saved before fingerprints. */
  sceneFingerprint: string | null;
  width: number;
  height: number;
  png: Uint8Array;
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
