import type { IsoInstant } from '@tinyfold/core/domain';
import type { ProjectColor } from '../../domain/project.js';
export interface ProjectRow {
  id: string;
  name: string;
  color: ProjectColor;
  position: number;
  version: number;
  archived_at: IsoInstant | null;
  created_at: IsoInstant;
  updated_at: IsoInstant;
}

export interface FolderRow {
  id: string;
  project_id: string;
  name: string;
  /** nameKey(name), unique among the project's active folders. */
  name_key: string;
  position: number;
  version: number;
  created_at: IsoInstant;
  updated_at: IsoInstant;
  deleted_at: IsoInstant | null;
}
export interface ProjectsTables {
  workspace_projects: ProjectRow;
  workspace_folders: FolderRow;
}
