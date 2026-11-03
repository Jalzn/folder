import type { IsoInstant } from '@tinyfold/core/domain';
import type { DocumentBlock } from '@tinyfold/rich-text/domain';
import type { ProjectKey, SearchItemType, SearchKey } from '../../domain/paging.js';
import type { ProjectColor } from '../../domain/project.js';
import type { BoardLabelColor } from '../../domain/read-models.js';

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
  color: BoardLabelColor;
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
