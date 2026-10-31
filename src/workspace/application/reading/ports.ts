import type { CanvasScene } from '../../domain/canvas.js';
import type { DocumentBlock, TaskSource, TaskStatus } from '../../domain/models.js';
import type { BoardKey, SearchKey } from '../../domain/paging.js';

/**
 * Queries of the agent read model. Nothing in the trash is ever returned: a trashed item reads as
 * missing, and a trashed source document has no title.
 */
export interface WorkspaceReader {
  projectsWithCounts(includeArchived: boolean, limit: number): Promise<ProjectWithCounts[]>;
  withoutProjectCounts(): Promise<ItemCounts>;
  searchItems(query: SearchQuery): Promise<Page<SearchHit>>;
  documentForReading(id: string): Promise<DocumentForReading | undefined>;
  tasksFromDocument(documentId: string, limit: number): Promise<OriginTask[]>;
  canvasForReading(id: string): Promise<CanvasForReading | undefined>;
  tasks(query: TaskQuery): Promise<Page<TaskListing>>;
  task(id: string): Promise<TaskDetail | undefined>;
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

export interface ProjectWithCounts extends ItemCounts {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Until stage 08, items may live outside any project, with null project fields. */
export interface ProjectReference {
  projectId: string | null;
  projectName: string | null;
  projectArchived: boolean;
}

export type SearchItemType = 'document' | 'drawing' | 'task';

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

export interface TaskListing extends ProjectReference {
  id: string;
  title: string;
  status: TaskStatus;
  position: number;
  updatedAt: string;
  source: { documentId: string; documentTitle: string | null; available: boolean } | null;
}

export interface TaskDetail extends Omit<TaskListing, 'source'> {
  createdAt: string;
  source: (Omit<TaskSource, 'documentTitle'> & { documentTitle: string | null }) | null;
}
