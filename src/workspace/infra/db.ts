import type { TaskStatus } from '../domain/models.js';
import type { ProjectColor } from '../domain/project.js';

export interface ProjectRow {
  id: string;
  name: string;
  color: ProjectColor;
  position: number;
  version: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  /** Never null since migration 005, whose triggers refuse it. */
  project_id: string | null;
  title: string;
  content: string;
  plain_text: string;
  search_text: string;
  format_version: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pinned_at: string | null;
}

export interface TaskRow {
  id: string;
  /** Never null since migration 005, whose triggers refuse it. */
  project_id: string | null;
  title: string;
  status: TaskStatus;
  position: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** A document deleted for good leaves `document_id` null; `document_title` is the title it had. */
export interface SourceRow {
  task_id: string;
  document_id: string | null;
  document_title: string;
  block_id: string | null;
  excerpt: string;
}

export interface CanvasPreviewRow {
  canvas_id: string;
  scene_version: number;
  scene_fingerprint: string | null;
  png: Uint8Array;
  width: number;
  height: number;
  created_at: string;
}

export interface WorkspaceTables {
  workspace_canvases: CanvasRow;
  workspace_canvas_previews: CanvasPreviewRow;
  workspace_projects: ProjectRow;
  workspace_documents: DocumentRow;
  workspace_tasks: TaskRow;
  workspace_task_sources: SourceRow;
  workspace_state: { id: number; board_revision: number };
}

export interface CanvasRow {
  id: string;
  /** Never null since migration 005, whose triggers refuse it. */
  project_id: string | null;
  title: string;
  scene: string;
  plain_text: string;
  search_text: string;
  format_version: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pinned_at: string | null;
}
