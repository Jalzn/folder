import type { TaskRecord } from '../../application/ports.js';
import type { Canvas, CanvasSummary } from '../../domain/canvas.js';
import type { Document, DocumentBlock, DocumentSummary, Project } from '../../domain/models.js';
import { searchText } from '../../domain/search-text.js';
import type { CanvasRow, DocumentRow, ProjectRow, TaskRow } from '../db.js';

export const projectModel = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  version: row.version,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
export const projectRow = (project: Project): ProjectRow => ({
  id: project.id,
  name: project.name,
  version: project.version,
  archived_at: project.archivedAt,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
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
});

export const taskModel = (row: TaskRow): TaskRecord => ({
  id: row.id,
  title: row.title,
  projectId: row.project_id,
  status: row.status,
  position: row.position,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});
export const taskRow = (task: TaskRecord): TaskRow => ({
  id: task.id,
  title: task.title,
  project_id: task.projectId,
  status: task.status,
  position: task.position,
  version: task.version,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
  deleted_at: task.deletedAt,
});
