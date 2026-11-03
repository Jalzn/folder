import type { IsoInstant } from '@tinyfold/core/domain';
import { sql } from 'kysely';
import type { ProjectReference } from '../../application/reading/read-models.js';

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

/** The board position used to order a document's originating tasks. */
export const columnRank = sql<number>`col.position`;

/** better-sqlite3 returns BLOBs as Buffer; the rest of the module only sees plain bytes. */
export const bytes = (blob: Uint8Array) => new Uint8Array(blob.buffer, blob.byteOffset, blob.byteLength);
