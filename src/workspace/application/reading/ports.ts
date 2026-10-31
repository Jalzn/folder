import type { CanvasScene } from '../../domain/canvas.js';
import type { DocumentBlock, TaskSource, TaskStatus } from '../../domain/models.js';

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
  /** Already normalized with searchText. */
  text: string | undefined;
  projectId: string | undefined;
  types: readonly SearchItemType[];
  limit: number;
  offset: number;
}

export type SearchHit = ProjectReference & { id: string; title: string; updatedAt: string } & (
    | { type: 'document' | 'drawing'; excerpt: string }
    | { type: 'task'; status: TaskStatus }
  );

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
}

export interface TaskQuery {
  projectId: string | undefined;
  statuses: readonly TaskStatus[] | undefined;
  /** Already normalized with searchText. */
  text: string | undefined;
  limit: number;
  offset: number;
}

export interface TaskListing extends ProjectReference {
  id: string;
  title: string;
  status: TaskStatus;
  updatedAt: string;
  source: { documentId: string; documentTitle: string | null; available: boolean } | null;
}

export interface TaskDetail extends Omit<TaskListing, 'source'> {
  createdAt: string;
  position: number;
  source: (Omit<TaskSource, 'documentTitle'> & { documentTitle: string | null }) | null;
}
