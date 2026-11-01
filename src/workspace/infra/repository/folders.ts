import { type Database, tables } from '@tinyfold/core/infra';
import type { FolderRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';
import { folderModel, folderRow } from './mappers.js';

export function folderRepository(connection: Database): FolderRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async findFolder(id) {
      const row = await db.selectFrom('workspace_folders').selectAll().where('id', '=', id).executeTakeFirst();
      return row && folderModel(row);
    },
    async activeFolders(projectId) {
      const rows = await db
        .selectFrom('workspace_folders')
        .selectAll()
        .where('project_id', '=', projectId)
        .where('deleted_at', 'is', null)
        .orderBy('position')
        .orderBy('id')
        .execute();
      return rows.map(folderModel);
    },
    async insertFolder(folder) {
      await db.insertInto('workspace_folders').values(folderRow(folder)).execute();
    },
  };
}
