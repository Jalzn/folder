import { type Database, tables } from '@tinyfold/core/infra';
import type { ProjectRepository } from '../../application/ports/projects.js';
import { projectModel, projectRow } from '../sql/mappers.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { versionedUpdate } from './versioned-update.js';

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
      await versionedUpdate(db.updateTable('workspace_projects').set(projectRow(project)), {
        id: project.id,
        expectedVersion: expectedVersion,
        idColumn: 'id',
        versionColumn: 'version',
      });
    },
    async setProjectPosition(id, position) {
      await db.updateTable('workspace_projects').set({ position }).where('id', '=', id).execute();
    },
  };
}
