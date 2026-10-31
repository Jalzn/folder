import { type BoardKey, SEARCH_ITEM_TYPES, type SearchItemType, type SearchKey } from '../../domain/paging.js';
import { TASK_STATUSES } from '../../domain/task-status.js';
import type { SearchHit, TaskListing } from './ports.js';

export const searchTypeRankOf = (type: SearchItemType) => SEARCH_ITEM_TYPES.indexOf(type);

/** Search results: more query words in the title first, then the most recent; type and ID break ties. */
export const searchKey = (hit: Pick<SearchHit, 'titleRank' | 'updatedAt' | 'type' | 'id'>): SearchKey => ({
  titleRank: hit.titleRank,
  updatedAt: hit.updatedAt,
  typeRank: searchTypeRankOf(hit.type),
  id: hit.id,
});

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function compareSearchKeys(a: SearchKey, b: SearchKey): number {
  return (
    a.titleRank - b.titleRank ||
    compareText(b.updatedAt, a.updatedAt) ||
    a.typeRank - b.typeRank ||
    compareText(a.id, b.id)
  );
}

/** Tasks in board order: the column, then the position within it. */
export const boardKey = (task: Pick<TaskListing, 'status' | 'position' | 'id'>): BoardKey => ({
  columnRank: TASK_STATUSES.indexOf(task.status),
  position: task.position,
  id: task.id,
});
