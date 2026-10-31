import type { Canvas, CanvasSummary } from '../domain/canvas.js';
import type { Document, DocumentSummary, Project, Task, TaskSource, TaskStatus } from '../domain/models.js';
import type { ListCanvasesInput, ListDocumentsInput, ListTasksInput } from './schemas.js';

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
  png: Uint8Array;
  width: number;
  height: number;
  createdAt: string;
}

export interface CanvasPreviewRepository {
  /** Version and trash state only, without reading the scene. */
  canvasState(id: string): Promise<{ version: number; deletedAt: string | null } | undefined>;
  canvasPreviewVersion(canvasId: string): Promise<number | null>;
  /** Replaces the drawing's preview. */
  saveCanvasPreview(preview: CanvasPreviewRecord): Promise<void>;
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
  /** A write that is safe to repeat, so it keeps no request record (and no copy of its input). */
  repeatableWrite<T>(work: (repository: WorkspaceRepository) => Promise<T>): Promise<T>;
}
