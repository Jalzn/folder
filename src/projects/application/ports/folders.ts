import type { Folder } from '../../domain/folders.js';
export interface FolderSummary {
  id: string;
  projectId: string;
  name: string;
  position: number;
  /** For renaming or deleting the folder from a list that is not the sidebar's tree. */
  version: number;
  items: number;
}

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
}
