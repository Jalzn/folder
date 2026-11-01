import type { Kysely } from 'kysely';
import type { FolderReference, WorkspaceReader } from '../../application/reading/ports.js';
import type { WorkspaceTables } from '../db.js';

type FolderReads = Pick<WorkspaceReader, 'folder'>;

/** The folder columns item queries select, from `folder` left-joined to `item`: null at the root. */
export const folderColumns = ['folder.id as folder_id', 'folder.name as folder_name'] as const;

export const folderReference = (row: {
  folder_id: string | null;
  folder_name: string | null;
}): FolderReference | null =>
  row.folder_id !== null && row.folder_name !== null ? { id: row.folder_id, name: row.folder_name } : null;

export function folderReads(db: Kysely<WorkspaceTables>): FolderReads {
  return {
    async folder(id) {
      const row = await db
        .selectFrom('workspace_folders')
        .select(['id', 'name', 'project_id', 'deleted_at'])
        .where('id', '=', id)
        .executeTakeFirst();
      return row && { id: row.id, name: row.name, projectId: row.project_id, deleted: row.deleted_at !== null };
    },
  };
}
