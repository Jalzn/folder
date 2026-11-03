import type { Kysely } from 'kysely';
import type { WorkspaceReader } from '../../application/reading/ports.js';
import type { WorkspaceTables } from '../sql/tables.js';

type FolderReads = Pick<WorkspaceReader, 'folder'>;

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
