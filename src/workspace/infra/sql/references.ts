import type { IsoInstant } from '@tinyfold/core/domain';
import { sql } from 'kysely';
import type { ProjectReference, SourceDocument } from '../../application/reading/read-models.js';

/**
 * The project columns every read query selects, from `item` joined to `project`. The join is inner:
 * since migration 005 every item has a project.
 */
export const projectColumns = [
  'project.id as project_id',
  'project.name as project_name',
  'project.archived_at as project_archived_at',
] as const;

export const projectReference = (row: {
  project_id: string;
  project_name: string;
  project_archived_at: IsoInstant | null;
}): ProjectReference => ({
  projectId: row.project_id,
  projectName: row.project_name,
  projectArchived: row.project_archived_at !== null,
});

/** The board order of a task's column, from `col` joined to `item`: its position among the active ones. */
export const columnRank = sql<number>`col.position`;

/** The source columns task queries select, from `source` and `document` left-joined to `item`. */
export const sourceColumns = [
  'source.document_id',
  'source.document_title as kept_title',
  'source.block_id',
  'source.excerpt',
  'document.title as document_title',
  'document.deleted_at as document_deleted_at',
] as const;

/**
 * A trashed source document reads as missing, without its title. One deleted for good is part of
 * the task's history, so its kept title stays, as the excerpt does.
 */
export function sourceDocument(row: {
  document_id: string | null;
  kept_title: string;
  document_title: string | null;
  document_deleted_at: IsoInstant | null;
}): SourceDocument {
  if (row.document_id === null) return { documentId: null, documentTitle: row.kept_title, available: false };
  if (row.document_title !== null && row.document_deleted_at === null)
    return { documentId: row.document_id, documentTitle: row.document_title, available: true };
  return { documentId: row.document_id, documentTitle: null, available: false };
}

/** better-sqlite3 returns BLOBs as Buffer; the rest of the module only sees plain bytes. */
export const bytes = (blob: Uint8Array) => new Uint8Array(blob.buffer, blob.byteOffset, blob.byteLength);
