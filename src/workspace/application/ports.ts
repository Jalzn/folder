import type { Canvas, CanvasSummary } from '../domain/canvas.js';
import type { Column } from '../domain/columns.js';
import type { Folder } from '../domain/folders.js';
import type { Label } from '../domain/labels.js';
import type { Document, DocumentContent, DocumentSummary, Project, Task, TaskSource } from '../domain/models.js';
import type { NavItemType } from '../domain/navigation.js';

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

/** An active folder as lists show it, with its live documents and drawings counted. */
export interface FolderSummary {
  id: string;
  projectId: string;
  name: string;
  position: number;
  /** For renaming or deleting the folder from a list that is not the sidebar's tree. */
  version: number;
  items: number;
}

/** A document or drawing as folder operations see it, live or trashed, without its content. */
export interface FolderItem {
  type: NavItemType;
  id: string;
  projectId: string;
  folderId: string | null;
  version: number;
  pinnedAt: string | null;
  deletedAt: string | null;
}

/** Folders of documents and drawings, active or deleted, and where items are filed. */
export interface FolderRepository {
  findFolder(id: string): Promise<Folder | undefined>;
  /** The project's active folders, in manual order. */
  activeFolders(projectId: string): Promise<Folder[]>;
  /** Active folders of one project, or of every project, by project and position. */
  folderSummaries(projectId?: string): Promise<FolderSummary[]>;
  insertFolder(folder: Folder): Promise<void>;
  saveFolder(folder: Folder, expectedVersion: number): Promise<void>;
  /** The order is not an edit: version and dates stay. */
  setFolderPosition(id: string, position: number): Promise<void>;
  /** The folder's live documents and drawings: the pinned ones first, by pinned_at, then the others. */
  itemsInFolder(folderId: string): Promise<FolderItem[]>;
  findItem(type: NavItemType, id: string): Promise<FolderItem | undefined>;
  /** Files an item at the root (null) or in a folder, pinned or not. Not an edit: version and dates stay. */
  placeItem(type: NavItemType, id: string, folderId: string | null, pinnedAt: string | null): Promise<void>;
  /** Sends an item to the trash at the expected version, keeping its folder as its origin, unpinned. */
  trashItem(type: NavItemType, id: string, at: string, expectedVersion: number): Promise<void>;
  /** Brings a trashed item back, at the expected version, into `folderId`, pinned or not. */
  restoreItem(
    type: NavItemType,
    id: string,
    place: { folderId: string | null; pinnedAt: string | null },
    at: string,
    expectedVersion: number,
  ): Promise<void>;
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
  nextPosition(projectId: string, columnId: string): Promise<number>;
  /** One project's live tasks of a column, in board order. */
  tasksInColumn(projectId: string, columnId: string): Promise<TaskRecord[]>;
  /** Moves a task within its column. The order is not an edit: version and dates stay. */
  setTaskPosition(id: string, position: number): Promise<void>;
  /** The task's labels, deleted ones included, which keep their links. */
  taskLabelIds(taskId: string): Promise<string[]>;
  /** Replaces the task's links to active labels; links to deleted ones stay. */
  setTaskLabels(taskId: string, labelIds: readonly string[]): Promise<void>;
}

/** Board columns, the same for every project. */
export interface ColumnRepository {
  /** The active columns in board order. */
  activeColumns(): Promise<Column[]>;
  findColumn(id: string): Promise<Column | undefined>;
  /** The live tasks of every project in each active column. */
  columnTaskCounts(): Promise<Map<string, number>>;
  insertColumn(column: Column): Promise<void>;
  saveColumn(column: Column, expectedVersion: number): Promise<void>;
  /** The order is not an edit: version and dates stay. */
  setColumnPosition(id: string, position: number): Promise<void>;
  /** Marks or unmarks the done column. Not an edit: version and dates stay. */
  setColumnDone(id: string, isDone: boolean): Promise<void>;
  /** Every task of the column, live and trashed, of every project, by project and board order. */
  tasksOfColumn(columnId: string): Promise<TaskRecord[]>;
  /** Sets the completion of every task in the column, live and trashed, without editing them. */
  setColumnCompletion(columnId: string, completedAt: string | null): Promise<void>;
  /** Sets one task's completion without editing it. */
  setTaskCompletion(taskId: string, completedAt: string | null): Promise<void>;
}

/** A label as lists show it, with the live tasks that use it. */
export interface LabelSummary {
  id: string;
  name: string;
  color: Label['color'];
  version: number;
  taskCount: number;
}

/** Labels, the same for every project. */
export interface LabelRepository {
  /** The labels with these IDs, active or deleted. */
  findLabels(ids: readonly string[]): Promise<Label[]>;
  findLabel(id: string): Promise<Label | undefined>;
  /** The active labels, in alphabetical order. */
  activeLabels(): Promise<Label[]>;
  /** The active labels with the live tasks that use each, in alphabetical order. */
  labelSummaries(): Promise<LabelSummary[]>;
  /** The live tasks linked to the label. */
  liveTasksWithLabel(labelId: string): Promise<number>;
  insertLabel(label: Label): Promise<void>;
  saveLabel(label: Label, expectedVersion: number): Promise<void>;
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
  /** The live pinned documents and drawings of one scope: the project's root (null) or a folder. */
  pinnedInScope(projectId: string, folderId: string | null): Promise<number>;
  /** Pins or unpins an item without making it an edit: version and dates stay. */
  setPinnedAt(type: NavItemType, id: string, pinnedAt: string | null): Promise<void>;
}

/** Documents and drawings moving between projects. */
export interface MoveRepository {
  /**
   * Sets the project, at the expected version, at its root and unpinned: a folder belongs to one
   * project. The version goes up and the dates stay.
   */
  moveItem(type: NavItemType, id: string, projectId: string, expectedVersion: number): Promise<void>;
}

/** The board revision orders concurrent task moves across devices. */
export interface BoardRepository {
  revision(): Promise<number>;
  bumpRevision(): Promise<number>;
}

export type WorkspaceRepository = ProjectRepository &
  FolderRepository &
  DocumentRepository &
  CanvasRepository &
  CanvasPreviewRepository &
  TaskRepository &
  ColumnRepository &
  LabelRepository &
  TrashRepository &
  PinRepository &
  MoveRepository &
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
