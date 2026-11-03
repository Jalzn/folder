import type { Folder } from '../../domain/folders.js';
import type { NavItemType } from '../../domain/navigation.js';

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
