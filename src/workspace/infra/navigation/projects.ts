import type { Kysely } from 'kysely';
import type { NavigationReader } from '../../application/navigation/ports.js';
import { itemTable } from '../sql/item-tables.js';
import { projectModel } from '../sql/mappers.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { openTask } from '../sql/task-predicates.js';

type ProjectReads = Pick<NavigationReader, 'findProject' | 'navItems' | 'folders' | 'openTaskCount'>;

export function projectReads(db: Kysely<WorkspaceTables>): ProjectReads {
  return {
    async findProject(projectId) {
      const row = await db.selectFrom('workspace_projects').selectAll().where('id', '=', projectId).executeTakeFirst();
      return row && projectModel(row);
    },

    async navItems(projectId, type) {
      const rows = await db
        .selectFrom(itemTable(db, type))
        .select(['item.id', 'item.title', 'item.updated_at', 'item.created_at', 'item.pinned_at', 'item.folder_id'])
        .where('item.project_id', '=', projectId)
        .where('item.deleted_at', 'is', null)
        .execute();
      return rows.map((row) => ({
        type,
        folderId: row.folder_id,
        id: row.id,
        title: row.title,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
        pinnedAt: row.pinned_at,
      }));
    },

    async folders(projectId) {
      return db
        .selectFrom('workspace_folders')
        .select(['id', 'name', 'position', 'version'])
        .where('project_id', '=', projectId)
        .where('deleted_at', 'is', null)
        .orderBy('position')
        .orderBy('id')
        .execute();
    },

    async openTaskCount(projectId) {
      const row = await db
        .selectFrom('workspace_tasks as task')
        .innerJoin('workspace_columns as col', 'col.id', 'task.column_id')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .where('task.project_id', '=', projectId)
        .where(openTask('task', 'col'))
        .executeTakeFirstOrThrow();
      return row.count;
    },
  };
}
