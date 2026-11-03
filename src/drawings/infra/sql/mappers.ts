import { searchText } from '#core/domain';
import type { Canvas, CanvasSummary } from '../../domain/index.js';
import type { CanvasRow } from './tables.js';

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
