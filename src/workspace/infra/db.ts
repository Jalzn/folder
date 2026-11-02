import type { LabelColor } from '../domain/labels.js';
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
  /** Required since migration 005, whose triggers refuse null; the column itself stays nullable. */
  project_id: string;
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
  /** Null at the project's root. A trashed item may keep a deleted folder, where it came from. */
  folder_id: string | null;
}

/** Since migration 007, which rebuilt the table: the column replaced the status. */
export interface TaskRow {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  position: number;
  /** A civil date, YYYY-MM-DD. */
  due_on: string | null;
  /** Set exactly in the done column, which a trigger keeps. */
  completed_at: string | null;
  /** The description, in the document block format, as JSON. */
  description: string;
  description_plain_text: string;
  /** searchText(title + "\n" + description_plain_text). */
  search_text: string;
  checklist_done: number;
  checklist_total: number;
  version: number;
  text_version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** A board column, the same for every project; a deleted one keeps its row. */
export interface ColumnRow {
  id: string;
  name: string;
  /** nameKey(name), unique among the active columns. */
  name_key: string;
  position: number;
  is_done: 0 | 1;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** A label, the same for every project; a deleted one keeps its row and its links. */
export interface LabelRow {
  id: string;
  name: string;
  /** nameKey(name), unique among the active labels. */
  name_key: string;
  color: LabelColor;
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

/** A deleted folder keeps its row (deleted_at): it names the origin of trashed items and can come back. */
export interface FolderRow {
  id: string;
  project_id: string;
  name: string;
  /** nameKey(name), unique among the project's active folders. */
  name_key: string;
  position: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WorkspaceTables {
  workspace_canvases: CanvasRow;
  workspace_folders: FolderRow;
  workspace_canvas_previews: CanvasPreviewRow;
  workspace_projects: ProjectRow;
  workspace_documents: DocumentRow;
  workspace_tasks: TaskRow;
  workspace_task_sources: SourceRow;
  workspace_columns: ColumnRow;
  workspace_labels: LabelRow;
  workspace_task_labels: { task_id: string; label_id: string };
  workspace_state: { id: number; board_revision: number };
}

export interface CanvasRow {
  id: string;
  /** Required since migration 005, whose triggers refuse null; the column itself stays nullable. */
  project_id: string;
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
  /** Null at the project's root. A trashed item may keep a deleted folder, where it came from. */
  folder_id: string | null;
}
