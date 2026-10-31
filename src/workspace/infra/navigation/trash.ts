import { type Kysely, sql } from 'kysely';
import type { NavigationReader, TrashItem } from '../../application/navigation/ports.js';
import type { TrashItemType } from '../../application/schemas/trash.js';
import type { WorkspaceTables } from '../db.js';
import { itemTable } from '../item-tables.js';

type TrashReads = Pick<NavigationReader, 'trashCount' | 'trashItems'>;

export function trashReads(db: Kysely<WorkspaceTables>): TrashReads {
  /** One type's items in the project's trash, in the columns every type shares. */
  const trashed = (projectId: string, type: TrashItemType) =>
    db
      .selectFrom(itemTable(db, type))
      .select([sql<TrashItemType>`${type}`.as('type'), 'item.id', 'item.title', 'item.version', 'item.deleted_at'])
      .where('item.project_id', '=', projectId)
      .where('item.deleted_at', 'is not', null)
      .$narrowType<{ deleted_at: string }>();

  return {
    async trashCount(projectId) {
      const row = await db
        .selectFrom(
          trashed(projectId, 'document')
            .unionAll(trashed(projectId, 'drawing'))
            .unionAll(trashed(projectId, 'task'))
            .as('trashed'),
        )
        .select(sql<number>`count(*)`.as('count'))
        .executeTakeFirstOrThrow();
      return row.count;
    },

    async trashItems(projectId, limit) {
      const rows = await trashed(projectId, 'document')
        .unionAll(trashed(projectId, 'drawing'))
        .unionAll(trashed(projectId, 'task'))
        .orderBy('deleted_at', 'desc')
        .orderBy('id')
        .limit(limit)
        .execute();
      return rows.map(
        (row): TrashItem => ({
          type: row.type,
          id: row.id,
          title: row.title,
          version: row.version,
          deletedAt: row.deleted_at,
        }),
      );
    },
  };
}
