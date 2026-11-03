import type { ModuleContext } from '@tinyfold/core/application';
import type { IsoInstant } from '@tinyfold/core/domain';
import type { Folder } from '../../domain/folders.js';
import type { FiledItem, FiledItemType } from '../../domain/items.js';

/** The project facts required when a coordinated flow changes placement. */
export interface ProjectFacts {
  id: string;
  archivedAt: IsoInstant | null;
}

export interface ProjectLookup<Project extends ProjectFacts = ProjectFacts> {
  findProject(id: string): Promise<Project | undefined>;
}

/** Documents and drawings participate through placement facts, without their content. */
export interface FolderItem extends FiledItem {
  type: FiledItemType;
}

interface FolderLookup {
  findFolder(id: string): Promise<Folder | undefined>;
}

interface ItemLookup {
  findItem(type: FiledItemType, id: string): Promise<FolderItem | undefined>;
}

interface ItemPlacement {
  /** A folder move preserves versions and edit dates. */
  placeItem(input: {
    type: FiledItemType;
    id: string;
    folderId: string | null;
    pinnedAt: IsoInstant | null;
  }): Promise<void>;
}

interface PinCount {
  /** The combined count of live documents and drawings in one project/folder scope. */
  pinnedInScope(input: { projectId: string; folderId: string | null }): Promise<number>;
}

/** Only the owner capabilities needed to delete and restore folders atomically. */
export interface FolderLifecyclePorts extends ProjectLookup, FolderLookup, ItemLookup, ItemPlacement, PinCount {
  activeFolders(projectId: string): Promise<Folder[]>;
  saveFolder(folder: Folder, expectedVersion: number): Promise<void>;
  setFolderPosition(id: string, position: number): Promise<void>;
  /** Live items, pinned first by pin instant and then ID. */
  itemsInFolder(folderId: string): Promise<FolderItem[]>;
  trashItem(input: { type: FiledItemType; id: string; at: IsoInstant; expectedVersion: number }): Promise<void>;
  restoreItem(input: {
    type: FiledItemType;
    id: string;
    place: { folderId: string | null; pinnedAt: IsoInstant | null };
    at: IsoInstant;
    expectedVersion: number;
  }): Promise<void>;
}

/** Placement changes consult organization facts and delegate writes to the item's owner. */
export interface MovePorts extends ProjectLookup, FolderLookup, ItemLookup, ItemPlacement, PinCount {
  /** A project move increments the version, clears folder/pin and preserves edit dates. */
  moveItem(input: { type: FiledItemType; id: string; projectId: string; expectedVersion: number }): Promise<void>;
}

export interface PinPorts extends FolderLookup, ItemLookup, PinCount {
  /** Pinning preserves the item's version and edit dates. */
  setPinnedAt(input: { type: FiledItemType; id: string; pinnedAt: IsoInstant | null }): Promise<void>;
}

/** Purging needs lifecycle facts and a retained source title, never full content. */
export interface TrashedItem {
  id: string;
  title: string;
  projectId: string | null;
  version: number;
  deletedAt: IsoInstant | null;
}

export interface TrashPorts {
  findDocument(id: string): Promise<TrashedItem | undefined>;
  findCanvas(id: string): Promise<TrashedItem | undefined>;
  findTask(id: string): Promise<TrashedItem | undefined>;
  keepTitleInSources(documentId: string, title: string): Promise<void>;
  deleteDocumentRow(id: string): Promise<void>;
  deleteCanvasRow(id: string): Promise<void>;
  deleteTaskRow(id: string): Promise<void>;
  bumpRevision(): Promise<number>;
}

/** Server composition assembles these ports; each workflow receives only its own subset. */
export type WorkspaceFlowPorts = FolderLifecyclePorts & MovePorts & PinPorts & TrashPorts;
export type WorkspaceFlowContext<Ports extends object = WorkspaceFlowPorts> = ModuleContext<Ports>;
