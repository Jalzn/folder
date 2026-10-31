import { type Database, tables } from '@tinyfold/core/infra';
import type { ProjectRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';
import { projectModel, projectRow } from './mappers.js';
import { expectUpdated } from './versioned-update.js';

export function projectRepository(connection: Database): ProjectRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async listProjects(includeArchived) {
      let query = db.selectFrom('workspace_projects').selectAll();
      if (!includeArchived) query = query.where('archived_at', 'is', null);
      return (await query.orderBy('updated_at', 'desc').orderBy('id').execute()).map(projectModel);
    },
    async findProject(id) {
      const row = await db.selectFrom('workspace_projects').selectAll().where('id', '=', id).executeTakeFirst();
      return row && projectModel(row);
    },
    async insertProject(project) {
      await db.insertInto('workspace_projects').values(projectRow(project)).execute();
    },
    async saveProject(project, expectedVersion) {
      const result = await db
        .updateTable('workspace_projects')
        .set(projectRow(project))
        .where('id', '=', project.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
  };
}
