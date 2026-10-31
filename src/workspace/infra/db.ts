import type { TaskStatus } from '../domain/models.js';

export interface ProjectRow {
  id: string;
  name: string;
  version: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
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
}

export interface TaskRow {
  id: string;
  project_id: string | null;
  title: string;
  status: TaskStatus;
  position: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SourceRow {
  task_id: string;
  document_id: string;
  block_id: string | null;
  excerpt: string;
}

export interface CanvasPreviewRow {
  canvas_id: string;
  scene_version: number;
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
}
