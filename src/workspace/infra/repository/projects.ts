import { type Database, tables } from '@tinyfold/core/infra';
import type { ProjectRepository } from '../../application/ports/projects.js';
import type { WorkspaceTables } from '../db.js';
import { projectModel, projectRow } from './mappers.js';
import { expectUpdated } from './versioned-update.js';

export function projectRepository(connection: Database): ProjectRepository {
  const db = tables<WorkspaceTables>(connection);
  const projects = () => db.selectFrom('workspace_projects').selectAll();
  return {
    async listProjects(includeArchived) {
      const active = await projects().where('archived_at', 'is', null).orderBy('position').orderBy('id').execute();
      const archived = includeArchived
        ? await projects().where('archived_at', 'is not', null).orderBy('archived_at', 'desc').orderBy('id').execute()
        : [];
      return [...active, ...archived].map(projectModel);
    },
    async findProject(id) {
      const row = await projects().where('id', '=', id).executeTakeFirst();
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
    async setProjectPosition(id, position) {
      await db.updateTable('workspace_projects').set({ position }).where('id', '=', id).execute();
    },
  };
}
