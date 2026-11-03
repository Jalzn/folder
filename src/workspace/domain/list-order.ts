import type { IsoInstant } from '@tinyfold/core/domain';
import { compareCodeUnits } from '@tinyfold/core/domain';
import { SEARCH_ITEM_TYPES, type SearchItemType, type SearchKey } from './paging.js';

export const searchTypeRankOf = (type: SearchItemType) => SEARCH_ITEM_TYPES.indexOf(type);

/** Search results: more query words in the title first, then the most recent; type and ID break ties. */
export const searchKey = (hit: {
  titleRank: number;
  updatedAt: IsoInstant;
  type: SearchItemType;
  id: string;
}): SearchKey => ({
  titleRank: hit.titleRank,
  updatedAt: hit.updatedAt,
  typeRank: searchTypeRankOf(hit.type),
  id: hit.id,
});

const compareText = compareCodeUnits;

export function compareSearchKeys(a: SearchKey, b: SearchKey): number {
  return (
    a.titleRank - b.titleRank ||
    compareText(b.updatedAt, a.updatedAt) ||
    a.typeRank - b.typeRank ||
    compareText(a.id, b.id)
  );
}
