import { type Kysely, sql } from 'kysely';
import type { NavigationReader, RecentItem } from '../../application/navigation/ports.js';
import { excerptAround } from '../../domain/excerpt.js';
import type { NavItemType } from '../../domain/navigation.js';
import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';
import type { WorkspaceTables } from '../db.js';
import { itemTable } from '../item-tables.js';
import { hydrateTasks } from '../repository/tasks.js';

type OverviewReads = Pick<NavigationReader, 'tasksInColumn' | 'recentItems'>;

/** Enough of the text for an excerpt of `excerptChars`, whatever the length of the rest. */
const excerptSource = 2 * NAVIGATION_LIMITS.overview.excerptChars;

export function overviewReads(db: Kysely<WorkspaceTables>): OverviewReads {
  /** One type's live items, with the start of their text and whether the text goes on. */
  const recent = (projectId: string, type: NavItemType) =>
    db
      .selectFrom(itemTable(db, type))
      .select([
        sql<NavItemType>`${type}`.as('type'),
        'item.id',
        'item.title',
        'item.updated_at',
        sql<string>`substr(item.plain_text, 1, ${excerptSource})`.as('text_start'),
        sql<number>`length(item.plain_text) > ${excerptSource}`.as('text_cut'),
      ])
      .where('item.project_id', '=', projectId)
      .where('item.deleted_at', 'is', null);

  return {
    async tasksInColumn(projectId, status, limit) {
      const rows = await db
        .selectFrom('workspace_tasks')
        .selectAll()
        .where('project_id', '=', projectId)
        .where('status', '=', status)
        .where('deleted_at', 'is', null)
        .orderBy('position')
        .orderBy('id')
        .limit(limit)
        .execute();
      return hydrateTasks(db, rows);
    },

    async recentItems(projectId, limit) {
      const rows = await recent(projectId, 'document')
        .unionAll(recent(projectId, 'drawing'))
        .orderBy('updated_at', 'desc')
        .orderBy('id')
        .limit(limit)
        .execute();
      return rows.map(
        (row): RecentItem => ({
          type: row.type,
          id: row.id,
          title: row.title,
          updatedAt: row.updated_at,
          excerpt: excerptAround(row.text_start, [], NAVIGATION_LIMITS.overview.excerptChars, 0, {
            before: false,
            after: Boolean(row.text_cut),
          }),
        }),
      );
    },
  };
}
