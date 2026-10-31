import type { Kysely } from 'kysely';
import type { NavigationReader } from '../../application/navigation/ports.js';
import { TASK_STATUSES, type TaskStatus } from '../../domain/task-status.js';
import type { WorkspaceTables } from '../db.js';
import { itemTable } from '../item-tables.js';
import { projectModel } from '../repository/mappers.js';

type ProjectReads = Pick<NavigationReader, 'findProject' | 'navItems' | 'taskCounts'>;

export function projectReads(db: Kysely<WorkspaceTables>): ProjectReads {
  return {
    async findProject(projectId) {
      const row = await db.selectFrom('workspace_projects').selectAll().where('id', '=', projectId).executeTakeFirst();
      return row && projectModel(row);
    },

    async navItems(projectId, type) {
      const rows = await db
        .selectFrom(itemTable(db, type))
        .select(['item.id', 'item.title', 'item.updated_at', 'item.created_at', 'item.pinned_at'])
        .where('item.project_id', '=', projectId)
        .where('item.deleted_at', 'is', null)
        .execute();
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
        pinnedAt: row.pinned_at,
      }));
    },

    async taskCounts(projectId) {
      const rows = await db
        .selectFrom('workspace_tasks')
        .select((eb) => ['status', eb.fn.countAll<number>().as('count')])
        .where('project_id', '=', projectId)
        .where('deleted_at', 'is', null)
        .groupBy('status')
        .execute();
      const counts = new Map(rows.map((row) => [row.status, row.count]));
      return Object.fromEntries(TASK_STATUSES.map((status) => [status, counts.get(status) ?? 0])) as Record<
        TaskStatus,
        number
      >;
    },
  };
}
