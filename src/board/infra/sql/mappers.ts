import { nameKey, searchText } from '@tinyfold/core/domain';
import type { DocumentBlock } from '@tinyfold/rich-text/domain';
import type { TaskRecord } from '../../application/ports/tasks.js';
import type { Column } from '../../domain/columns.js';
import type { Label } from '../../domain/labels.js';
import type { ColumnRow, LabelRow, TaskRow } from './tables.js';
export const taskModel = (row: TaskRow): TaskRecord => ({
  id: row.id,
  title: row.title,
  projectId: row.project_id,
  columnId: row.column_id,
  position: row.position,
  dueOn: row.due_on,
  completedAt: row.completed_at,
  description: JSON.parse(row.description) as DocumentBlock[],
  descriptionPlainText: row.description_plain_text,
  checklistDone: row.checklist_done,
  checklistTotal: row.checklist_total,
  version: row.version,
  textVersion: row.text_version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

/** The columns a field save writes: never the text. */
export const taskFieldsRow = (task: TaskRecord) => ({
  project_id: task.projectId,
  column_id: task.columnId,
  position: task.position,
  due_on: task.dueOn,
  completed_at: task.completedAt,
  version: task.version,
  updated_at: task.updatedAt,
  deleted_at: task.deletedAt,
});

/** The columns a text save writes, the search text derived from the title and the description. */
export const taskTextRow = (task: TaskRecord) => ({
  title: task.title,
  description: JSON.stringify(task.description),
  description_plain_text: task.descriptionPlainText,
  search_text: searchText(`${task.title}\n${task.descriptionPlainText}`),
  checklist_done: task.checklistDone,
  checklist_total: task.checklistTotal,
  text_version: task.textVersion,
  updated_at: task.updatedAt,
});

export const taskRow = (task: TaskRecord): TaskRow => ({
  id: task.id,
  created_at: task.createdAt,
  ...taskFieldsRow(task),
  ...taskTextRow(task),
});

export const columnModel = (row: ColumnRow): Column => ({
  id: row.id,
  name: row.name,
  position: row.position,
  isDone: row.is_done === 1,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});
export const columnRow = (column: Column): ColumnRow => ({
  id: column.id,
  name: column.name,
  name_key: nameKey(column.name),
  position: column.position,
  is_done: column.isDone ? 1 : 0,
  version: column.version,
  created_at: column.createdAt,
  updated_at: column.updatedAt,
  deleted_at: column.deletedAt,
});

export const labelModel = (row: LabelRow): Label => ({
  id: row.id,
  name: row.name,
  color: row.color,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});
export const labelRow = (label: Label): LabelRow => ({
  id: label.id,
  name: label.name,
  name_key: nameKey(label.name),
  color: label.color,
  version: label.version,
  created_at: label.createdAt,
  updated_at: label.updatedAt,
  deleted_at: label.deletedAt,
});
