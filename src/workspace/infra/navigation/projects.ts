import type { Kysely } from 'kysely';
import type { NavigationReader } from '../../application/navigation/ports.js';
import type { WorkspaceTables } from '../db.js';

type ProjectReads = Pick<NavigationReader, 'hasProject'>;

export function projectReads(db: Kysely<WorkspaceTables>): ProjectReads {
  return {
    async hasProject(projectId) {
      const row = await db.selectFrom('workspace_projects').select('id').where('id', '=', projectId).executeTakeFirst();
      return row !== undefined;
    },
  };
}
