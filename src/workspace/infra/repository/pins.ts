import { type Database, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { PinRepository } from '../../application/ports.js';
import type { NavItemType } from '../../domain/navigation.js';
import type { WorkspaceTables } from '../db.js';
import { itemTable } from '../item-tables.js';

export function pinRepository(connection: Database): PinRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async pinnedInScope(projectId, folderId) {
      const pinned = (type: NavItemType) => {
        const query = db
          .selectFrom(itemTable(db, type))
          .select('item.id')
          .where('item.project_id', '=', projectId)
          .where('item.pinned_at', 'is not', null)
          .where('item.deleted_at', 'is', null);
        return folderId === null
          ? query.where('item.folder_id', 'is', null)
          : query.where('item.folder_id', '=', folderId);
      };
      const row = await db
        .selectFrom(pinned('document').unionAll(pinned('drawing')).as('pinned'))
        .select(sql<number>`count(*)`.as('count'))
        .executeTakeFirstOrThrow();
      return row.count;
    },
    async setPinnedAt(type, id, pinnedAt) {
      await db.updateTable(itemTable(db, type)).set({ pinned_at: pinnedAt }).where('item.id', '=', id).execute();
    },
  };
}
