import type { Calendar } from '../calendar.js';
import type { EmbedReader } from '../embeds/ports.js';
import type {
  DocumentForReading,
  FolderReference,
  OriginTask,
  Page,
  ProjectQuery,
  ProjectWithCounts,
  SearchHit,
  SearchQuery,
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
  /** A folder, active or deleted, for the reads it filters. */
  folder(id: string): Promise<(FolderReference & { projectId: string; deleted: boolean }) | undefined>;
}

export interface ReadingContext {
  /** The owner's time zone and today in it. */
  calendar(): Promise<Calendar>;
  read<T>(work: (reader: WorkspaceReader) => Promise<T>): Promise<T>;
}
