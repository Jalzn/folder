import type { TaskRecord } from '../../application/ports/tasks.js';
import type { Canvas, CanvasSummary } from '../../domain/canvas.js';
import type { Column } from '../../domain/columns.js';
import type { Document, DocumentBlock, DocumentSummary } from '../../domain/document-models.js';
import type { Folder } from '../../domain/folders.js';
import type { Label } from '../../domain/labels.js';
import { nameKey } from '../../domain/names.js';
import type { Project } from '../../domain/project-models.js';
import { searchText } from '../../domain/search-text.js';
import type { CanvasRow, ColumnRow, DocumentRow, FolderRow, LabelRow, ProjectRow, TaskRow } from '../db.js';

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

export const documentSummary = (row: Omit<DocumentRow, 'content' | 'search_text'>): DocumentSummary => ({
  id: row.id,
  title: row.title,
  projectId: row.project_id,
  plainText: row.plain_text,
  formatVersion: row.format_version,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  pinnedAt: row.pinned_at,
  folderId: row.folder_id,
});
export const documentModel = (row: DocumentRow): Document => ({
  ...documentSummary(row),
  content: JSON.parse(row.content) as DocumentBlock[],
});
export const documentRow = (document: Document): DocumentRow => ({
  id: document.id,
  project_id: document.projectId,
  title: document.title,
  content: JSON.stringify(document.content),
  plain_text: document.plainText,
  search_text: searchText(`${document.title}\n${document.plainText}`),
  format_version: document.formatVersion,
  version: document.version,
  created_at: document.createdAt,
  updated_at: document.updatedAt,
  deleted_at: document.deletedAt,
  pinned_at: document.pinnedAt,
  folder_id: document.folderId,
});

export const canvasSummary = (row: Omit<CanvasRow, 'scene' | 'search_text'>): CanvasSummary => ({
  id: row.id,
  title: row.title,
  projectId: row.project_id,
  plainText: row.plain_text,
  formatVersion: row.format_version,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  pinnedAt: row.pinned_at,
  folderId: row.folder_id,
});
export const canvasModel = (row: CanvasRow): Canvas => ({
  ...canvasSummary(row),
  scene: JSON.parse(row.scene) as Canvas['scene'],
});
export const canvasRow = (canvas: Canvas): CanvasRow => ({
  id: canvas.id,
  project_id: canvas.projectId,
  title: canvas.title,
  scene: JSON.stringify(canvas.scene),
  plain_text: canvas.plainText,
  search_text: searchText(`${canvas.title}\n${canvas.plainText}`),
  format_version: canvas.formatVersion,
  version: canvas.version,
  created_at: canvas.createdAt,
  updated_at: canvas.updatedAt,
  deleted_at: canvas.deletedAt,
  pinned_at: canvas.pinnedAt,
  folder_id: canvas.folderId,
});

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
