import type { Canvas, CanvasSummary } from '../domain/canvas.js';
import type { Document, DocumentSummary, Project, Task, TaskSource, TaskStatus } from '../domain/models.js';
import type { NavItemType } from '../domain/navigation.js';

export type TaskRecord = Omit<Task, 'source'> & { deletedAt: string | null };

/** A new task's source, which keeps the document's title for when the document is deleted for good. */
export interface TaskSourceRecord extends Pick<TaskSource, 'blockId' | 'excerpt' | 'documentTitle'> {
  taskId: string;
  documentId: string;
}

/** Which documents or drawings to list: one project's or every project's, live or trashed. */
export interface ItemListQuery {
  projectId?: string | undefined;
  /** Text the item contains, ignoring case and accents. */
  query?: string | undefined;
  deleted?: boolean | undefined;
}

export interface TaskListQuery {
  projectId?: string | undefined;
  /** Only tasks created from this document. */
  documentId?: string | undefined;
}

export interface ProjectRepository {
  /** Active projects in selector order, then, when asked, archived ones from the most recently archived. */
  listProjects(includeArchived: boolean): Promise<Project[]>;
  findProject(id: string): Promise<Project | undefined>;
  insertProject(project: Project): Promise<void>;
  saveProject(project: Project, expectedVersion: number): Promise<void>;
  /** Moves a project in the selector. The order is not an edit: version and dates stay. */
  setProjectPosition(id: string, position: number): Promise<void>;
}

export interface DocumentRepository {
  listDocuments(query: ItemListQuery): Promise<DocumentSummary[]>;
  findDocument(id: string): Promise<Document | undefined>;
  insertDocument(document: Document): Promise<void>;
  saveDocument(document: Document, expectedVersion: number): Promise<void>;
}

export interface CanvasRepository {
  listCanvases(query: ItemListQuery): Promise<CanvasSummary[]>;
  findCanvas(id: string): Promise<Canvas | undefined>;
  insertCanvas(canvas: Canvas): Promise<void>;
  saveCanvas(canvas: Canvas, expectedVersion: number): Promise<void>;
}

export interface TaskRepository {
  listTasks(query: TaskListQuery): Promise<Task[]>;
  findTask(id: string): Promise<TaskRecord | undefined>;
  taskView(id: string): Promise<Task>;
  insertTask(task: TaskRecord): Promise<void>;
  saveTask(task: TaskRecord, expectedVersion: number): Promise<void>;
  insertSource(source: TaskSourceRecord): Promise<void>;
  nextPosition(status: TaskStatus): Promise<number>;
  tasksInColumn(status: TaskStatus): Promise<TaskRecord[]>;
}

export interface CanvasPreviewRecord {
  canvasId: string;
  sceneVersion: number;
  sceneFingerprint: string;
  png: Uint8Array;
  width: number;
  height: number;
  createdAt: string;
}

export interface CanvasPreviewRepository {
  /** The scene the stored preview shows, without the image; null fingerprints predate them. */
  canvasPreview(canvasId: string): Promise<{ sceneVersion: number; sceneFingerprint: string | null } | undefined>;
  /** Replaces the drawing's preview. */
  saveCanvasPreview(preview: CanvasPreviewRecord): Promise<void>;
}

/** Inflates PNG image data, which the pure domain cannot do. */
export interface PngImageData {
  /** `compressed` inflated, if it is one zlib stream of exactly `size` bytes; never inflates more. */
  inflate(compressed: Uint8Array, size: number): Uint8Array | undefined;
}

/** Deleting items for good. Drawing previews and task sources follow their item by foreign key. */
export interface TrashRepository {
  /** Keeps the document's current title on the sources of the tasks created from it. */
  keepTitleInSources(documentId: string, title: string): Promise<void>;
  /** Task sources keep the excerpt and the title, without the document. */
  deleteDocumentRow(id: string): Promise<void>;
  /** The preview goes with the drawing. */
  deleteCanvasRow(id: string): Promise<void>;
  /** The source goes with the task. */
  deleteTaskRow(id: string): Promise<void>;
}

/** Documents and drawings pinned at the top of their project's sidebar. */
export interface PinRepository {
  /** The live pinned documents and drawings of the project, together. */
  pinnedCount(projectId: string | null): Promise<number>;
  /** Pins or unpins an item without making it an edit: version and dates stay. */
  setPinnedAt(type: NavItemType, id: string, pinnedAt: string | null): Promise<void>;
}

/** The board revision orders concurrent task moves across devices. */
export interface BoardRepository {
  revision(): Promise<number>;
  bumpRevision(): Promise<number>;
}

export type WorkspaceRepository = ProjectRepository &
  DocumentRepository &
  CanvasRepository &
  CanvasPreviewRepository &
  TaskRepository &
  TrashRepository &
  PinRepository &
  BoardRepository;

export interface WorkspaceContext {
  now(): string;
  newId(): string;
  read<T>(work: (repository: WorkspaceRepository) => Promise<T>): Promise<T>;
  write<T>(
    operation: string,
    input: { requestId: string },
    work: (repository: WorkspaceRepository) => Promise<T>,
  ): Promise<T>;
  /**
   * A write transaction that keeps no request record, and so no copy of its input. Only for writes
   * that are safe to repeat as they are, such as storing a drawing preview.
   */
  writeWithoutRequestRecord<T>(work: (repository: WorkspaceRepository) => Promise<T>): Promise<T>;
}
