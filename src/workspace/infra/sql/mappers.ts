import type { Project } from '../../domain/project-models.js';
import type { BoardColumn } from '../../domain/read-models.js';
import type { ColumnRow, ProjectRow } from './tables.js';
export const projectModel = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  color: row.color,
  position: row.position,
  version: row.version,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const columnModel = (row: ColumnRow): BoardColumn => ({
  id: row.id,
  name: row.name,
  position: row.position,
  isDone: row.is_done === 1,
});
