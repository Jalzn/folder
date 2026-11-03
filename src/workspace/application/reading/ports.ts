import type { Column } from '../../domain/columns.js';
import type { Label } from '../../domain/labels.js';
import type { Calendar } from '../calendar.js';
import type { EmbedReader } from '../embeds/ports.js';
import type {
  CanvasForReading,
  DocumentForReading,
  FolderReference,
  OriginTask,
  Page,
  ProjectQuery,
  ProjectWithCounts,
  SearchHit,
  SearchQuery,
  TaskForReading,
  TaskListing,
  TaskQuery,
} from './read-models.js';

/**
 * Queries of the agent read model. Nothing in the trash is ever returned: a trashed item reads as
 * missing, and a trashed source document has no title.
 */
export interface WorkspaceReader extends EmbedReader {
  projectsWithCounts(query: ProjectQuery): Promise<Page<ProjectWithCounts>>;
  searchItems(query: SearchQuery): Promise<Page<SearchHit>>;
  documentForReading(id: string): Promise<DocumentForReading | undefined>;
  /** The first `limit` tasks created from the document, in board order, and how many there are. */
  tasksFromDocument(documentId: string, limit: number): Promise<{ items: OriginTask[]; total: number }>;
  canvasForReading(id: string): Promise<CanvasForReading | undefined>;
  tasks(query: TaskQuery): Promise<Page<TaskListing>>;
  task(id: string): Promise<TaskForReading | undefined>;
  /** Counts every change to the board's tasks. */
  boardRevision(): Promise<number>;
  /** A folder, active or deleted, for the reads it filters. */
  folder(id: string): Promise<(FolderReference & { projectId: string; deleted: boolean }) | undefined>;
  /** The active columns in board order, which list_tasks filters by name. */
  columns(): Promise<Column[]>;
  /** The active labels in alphabetical order, which list_tasks filters by name. */
  labels(): Promise<Label[]>;
}

export interface ReadingContext {
  /** The owner's time zone and today in it. */
  calendar(): Promise<Calendar>;
  read<T>(work: (reader: WorkspaceReader) => Promise<T>): Promise<T>;
}
