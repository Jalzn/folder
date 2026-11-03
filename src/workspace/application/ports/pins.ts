import type { NavItemType } from '../../domain/navigation.js';

/** Documents and drawings pinned at the top of their project's sidebar. */
export interface PinRepository {
  /** The live pinned documents and drawings of one scope: the project's root (null) or a folder. */
  pinnedInScope(projectId: string, folderId: string | null): Promise<number>;
  /** Pins or unpins an item without making it an edit: version and dates stay. */
  setPinnedAt(type: NavItemType, id: string, pinnedAt: string | null): Promise<void>;
}
