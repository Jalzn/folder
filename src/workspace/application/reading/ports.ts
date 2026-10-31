import type { CanvasScene } from '../../domain/canvas.js';
import type { DocumentBlock, TaskSource, TaskStatus } from '../../domain/models.js';
import type { BoardKey, ProjectKey, SearchItemType, SearchKey } from '../../domain/paging.js';
import type { ProjectColor } from '../../domain/project.js';

/**
 * Queries of the agent read model. Nothing in the trash is ever returned: a trashed item reads as
 * missing, and a trashed source document has no title.
 */
export interface WorkspaceReader {
  projectsWithCounts(query: ProjectQuery): Promise<Page<ProjectWithCounts>>;
  searchItems(query: SearchQuery): Promise<Page<SearchHit>>;
  documentForReading(id: string): Promise<DocumentForReading | undefined>;
  /** The first `limit` tasks created from the document, in board order, and how many there are. */
  tasksFromDocument(documentId: string, limit: number): Promise<{ items: OriginTask[]; total: number }>;
  canvasForReading(id: string): Promise<CanvasForReading | undefined>;
  tasks(query: TaskQuery): Promise<Page<TaskListing>>;
  task(id: string): Promise<TaskDetail | undefined>;
  /** Counts every change to the board's tasks. */
  boardRevision(): Promise<number>;
}

export interface ReadingContext {
  read<T>(work: (reader: WorkspaceReader) => Promise<T>): Promise<T>;
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
  createdAt: string;
  updatedAt: string;
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
  types: readonly SearchItemType[];
  limit: number;
  /** The key of the last item of the previous page. */
  after: SearchKey | undefined;
}

export type SearchHit = ProjectReference & {
  id: string;
  title: string;
  updatedAt: string;
  /** How many query words the title lacks; it orders the results and is not shown. */
  titleRank: number;
} & ({ type: 'document' | 'drawing'; excerpt: string } | { type: 'task'; status: TaskStatus });

export interface DocumentForReading extends ProjectReference {
  id: string;
  title: string;
  content: DocumentBlock[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface OriginTask {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface CanvasForReading extends ProjectReference {
  id: string;
  title: string;
  scene: CanvasScene;
  version: number;
  updatedAt: string;
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
  statuses: readonly TaskStatus[] | undefined;
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
  status: TaskStatus;
  position: number;
  updatedAt: string;
  source: SourceDocument | null;
}

export interface TaskDetail extends Omit<TaskListing, 'source'> {
  createdAt: string;
  source: (Omit<TaskSource, keyof SourceDocument> & SourceDocument) | null;
}
