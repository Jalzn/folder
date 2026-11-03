import { nameKey } from '@tinyfold/core/domain';
import type { Folder, Project } from '../../domain/index.js';
import type { FolderRow, ProjectRow } from './tables.js';
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
export const projectRow = (project: Project): ProjectRow => ({
  id: project.id,
  name: project.name,
  color: project.color,
  position: project.position,
  version: project.version,
  archived_at: project.archivedAt,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
});

export const folderModel = (row: FolderRow): Folder => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  position: row.position,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});
export const folderRow = (folder: Folder): FolderRow => ({
  id: folder.id,
  project_id: folder.projectId,
  name: folder.name,
  name_key: nameKey(folder.name),
  position: folder.position,
  version: folder.version,
  created_at: folder.createdAt,
  updated_at: folder.updatedAt,
  deleted_at: folder.deletedAt,
});
