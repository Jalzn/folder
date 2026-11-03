import type { IsoInstant } from '@tinyfold/core/domain';
export const ITEM_TYPES = ['document', 'drawing', 'task'] as const;
export const FILED_ITEM_TYPES = ['document', 'drawing'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export type FiledItemType = (typeof FILED_ITEM_TYPES)[number];
export interface FiledItem {
  id: string;
  projectId: string;
  folderId: string | null;
  version: number;
  pinnedAt: IsoInstant | null;
  deletedAt: IsoInstant | null;
}

/**
 * What restoring a document or drawing answers. `folderGone` says its folder was deleted meanwhile,
 * so it came back at the project's root instead.
 */
export interface RestoreAck {
  id: string;
  version: number;
  updatedAt: IsoInstant;
  folderGone: boolean;
}

export interface ItemAck {
  id: string;
  version: number;
  updatedAt: IsoInstant;
}

export type DocumentAck = ItemAck;
