import { type Database, tables, versionedUpdate } from '@tinyfold/core/infra';
import type { FolderRepository } from '../../application/ports/folders.js';
import { folderModel, folderRow } from '../sql/mappers.js';
import type { ProjectsTables } from '../sql/tables.js';
export function folderRepository(
  connection: Database,
  counts: (ids: string[]) => Promise<Map<string, number>>,
): FolderRepository {
  const db = tables<ProjectsTables>(connection);
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
    async folderSummaries(projectId) {
      let query = db
        .selectFrom('workspace_folders as folder')
        .innerJoin('workspace_projects as project', 'project.id', 'folder.project_id')
        .select(['folder.id', 'folder.project_id', 'folder.name', 'folder.position', 'folder.version'])
        .where('folder.deleted_at', 'is', null);
      if (projectId) query = query.where('folder.project_id', '=', projectId);
      const rows = await query.orderBy('project.position').orderBy('project.id').orderBy('folder.position').execute();
      const totals = await counts(rows.map((row) => row.id));
      return rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        position: row.position,
        version: row.version,
        items: totals.get(row.id) ?? 0,
      }));
    },
    async insertFolder(folder) {
      await db.insertInto('workspace_folders').values(folderRow(folder)).execute();
    },
    async saveFolder(folder, expectedVersion) {
      await versionedUpdate(db.updateTable('workspace_folders').set(folderRow(folder)), {
        id: folder.id,
        expectedVersion: expectedVersion,
        idColumn: 'id',
        versionColumn: 'version',
      });
    },
    async setFolderPosition(id, position) {
      await db.updateTable('workspace_folders').set({ position }).where('id', '=', id).execute();
    },
  };
}
