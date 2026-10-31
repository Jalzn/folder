import { sql } from 'kysely';
import type { ProjectReference } from '../../application/reading/ports.js';

/** The project columns every read query selects, from `item` left-joined to `project`. */
export const projectColumns = [
  'item.project_id',
  'project.name as project_name',
  'project.archived_at as project_archived_at',
] as const;

export const projectReference = (row: {
  project_id: string | null;
  project_name: string | null;
  project_archived_at: string | null;
}): ProjectReference => ({
  projectId: row.project_id,
  projectName: row.project_name,
  projectArchived: row.project_archived_at !== null,
});

/** The board columns in order: todo, doing, done. */
export const columnRank = sql<number>`case item.status when 'todo' then 0 when 'doing' then 1 else 2 end`;

/** A trashed source document is unavailable and keeps no title. */
export const sourceDocument = (title: string | null, deletedAt: string | null) =>
  title !== null && deletedAt === null
    ? { documentTitle: title, available: true }
    : { documentTitle: null, available: false };

/** better-sqlite3 returns BLOBs as Buffer; the rest of the module only sees plain bytes. */
export const bytes = (blob: Uint8Array) => new Uint8Array(blob.buffer, blob.byteOffset, blob.byteLength);
