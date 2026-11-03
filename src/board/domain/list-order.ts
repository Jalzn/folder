import type { BoardKey } from './paging.js';
export const boardKey = (task: { columnPosition: number; position: number; id: string }): BoardKey => ({
  columnRank: task.columnPosition,
  position: task.position,
  id: task.id,
});
