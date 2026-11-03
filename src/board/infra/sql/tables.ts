import type { CivilDate, IsoInstant } from '#core/domain';
import type { LabelColor } from '../../domain/labels.js';

export interface TaskRow {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  position: number;
  /** A civil date, YYYY-MM-DD. */
  due_on: CivilDate | null;
  /** Set exactly in the done column, which a trigger keeps. */
  completed_at: IsoInstant | null;
  /** The description, in the document block format, as JSON. */
  description: string;
  description_plain_text: string;
  /** searchText(title + "\n" + description_plain_text). */
  search_text: string;
  checklist_done: number;
  checklist_total: number;
  version: number;
  text_version: number;
  created_at: IsoInstant;
  updated_at: IsoInstant;
  deleted_at: IsoInstant | null;
}

export interface ColumnRow {
  id: string;
  name: string;
  /** nameKey(name), unique among the active columns. */
  name_key: string;
  position: number;
  is_done: 0 | 1;
  version: number;
  created_at: IsoInstant;
  updated_at: IsoInstant;
  deleted_at: IsoInstant | null;
}

export interface LabelRow {
  id: string;
  name: string;
  /** nameKey(name), unique among the active labels. */
  name_key: string;
  color: LabelColor;
  version: number;
  created_at: IsoInstant;
  updated_at: IsoInstant;
  deleted_at: IsoInstant | null;
}

export interface SourceRow {
  task_id: string;
  document_id: string | null;
  document_title: string;
  block_id: string | null;
  excerpt: string;
}

export interface BoardTables {
  workspace_tasks: TaskRow;
  workspace_columns: ColumnRow;
  workspace_labels: LabelRow;
  workspace_task_sources: SourceRow;
  workspace_task_labels: { task_id: string; label_id: string };
  workspace_state: { id: number; board_revision: number };
}
