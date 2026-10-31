import type { Canvas, CanvasSummary } from '../domain/canvas.js';
import type { Document, DocumentSummary, Project, Task, TaskSource, TaskStatus } from '../domain/models.js';
import type { ListCanvasesInput } from './schemas/canvases.js';
import type { ListDocumentsInput } from './schemas/documents.js';
import type { ListTasksInput } from './schemas/tasks.js';

export type TaskRecord = Omit<Task, 'source'> & { deletedAt: string | null };
export type TaskSourceRecord = Pick<TaskSource, 'documentId' | 'blockId' | 'excerpt'> & { taskId: string };

export interface ProjectRepository {
  listProjects(includeArchived: boolean): Promise<Project[]>;
  findProject(id: string): Promise<Project | undefined>;
  insertProject(project: Project): Promise<void>;
  saveProject(project: Project, expectedVersion: number): Promise<void>;
}

export interface DocumentRepository {
  listDocuments(input: ListDocumentsInput): Promise<DocumentSummary[]>;
  findDocument(id: string): Promise<Document | undefined>;
  insertDocument(document: Document): Promise<void>;
  saveDocument(document: Document, expectedVersion: number): Promise<void>;
}

export interface CanvasRepository {
  listCanvases(input: ListCanvasesInput): Promise<CanvasSummary[]>;
  findCanvas(id: string): Promise<Canvas | undefined>;
  insertCanvas(canvas: Canvas): Promise<void>;
  saveCanvas(canvas: Canvas, expectedVersion: number): Promise<void>;
}

export interface TaskRepository {
  listTasks(input: ListTasksInput): Promise<Task[]>;
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
