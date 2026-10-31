import type { TrashItemType } from '../schemas/trash.js';

/** Queries the interface uses to find its way around one project. Archived projects answer too. */
export interface NavigationReader {
  /** Whether the project exists, archived or not. */
  hasProject(projectId: string): Promise<boolean>;
  /** The first `limit` items of the project's trash, of every type, the most recently deleted first. */
  trashItems(projectId: string, limit: number): Promise<TrashItem[]>;
}

export interface NavigationContext {
  read<T>(work: (reader: NavigationReader) => Promise<T>): Promise<T>;
}

export interface TrashItem {
  type: TrashItemType;
  id: string;
  title: string;
  /** What restoring or deleting the item for good must expect. */
  version: number;
  deletedAt: string;
}
