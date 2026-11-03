import type { IsoInstant } from '#core/domain';
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
