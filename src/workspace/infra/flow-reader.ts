import type { IsoInstant } from '@tinyfold/core/domain';
import { type Database, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { FolderItem } from '../application/ports/context.js';
import type { NavItemType } from '../domain/navigation.js';
import { itemTable } from './sql/item-tables.js';
import type { WorkspaceTables } from './sql/tables.js';

const itemColumns = [
  'item.id',
  'item.project_id',
  'item.folder_id',
  'item.version',
  'item.pinned_at',
  'item.deleted_at',
] as const;

interface ItemRow {
  id: string;
  project_id: string;
  folder_id: string | null;
  version: number;
  pinned_at: IsoInstant | null;
  deleted_at: IsoInstant | null;
}

const folderItem = (type: NavItemType, row: ItemRow): FolderItem => ({
  type,
  id: row.id,
  projectId: row.project_id,
  folderId: row.folder_id,
  version: row.version,
  pinnedAt: row.pinned_at,
  deletedAt: row.deleted_at,
});

export function flowReader(connection: Database) {
  const db = tables<WorkspaceTables>(connection);
  return {
    async itemsInFolder(folderId: string) {
      const live = (type: NavItemType) =>
        db
          .selectFrom(itemTable(db, type))
          .select([sql<NavItemType>`${type}`.as('type'), ...itemColumns])
          .where('item.folder_id', '=', folderId)
          .where('item.deleted_at', 'is', null);
      const rows = await db
        .selectFrom(live('document').unionAll(live('drawing')).as('filed'))
        .selectAll()
        .orderBy(sql`filed.pinned_at is null`)
        .orderBy('filed.pinned_at')
        .orderBy('filed.id')
        .execute();
      return rows.map((row) => folderItem(row.type, row));
    },
    async findItem(type: NavItemType, id: string) {
      const row = await db
        .selectFrom(itemTable(db, type))
        .select(itemColumns)
        .where('item.id', '=', id)
        .executeTakeFirst();
      return row && folderItem(type, row);
    },
    async pinnedInScope({ projectId, folderId }: { projectId: string; folderId: string | null }) {
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
    async folderItemCounts(ids: string[]) {
      if (!ids.length) return new Map<string, number>();
      const live = (type: NavItemType) =>
        db
          .selectFrom(itemTable(db, type))
          .select(['item.folder_id'])
          .where('item.deleted_at', 'is', null)
          .where('item.folder_id', 'in', ids);
      const rows = await db
        .selectFrom(live('document').unionAll(live('drawing')).as('filed'))
        .select(['filed.folder_id', sql<number>`count(*)`.as('items')])
        .groupBy('filed.folder_id')
        .execute();
      return new Map(rows.flatMap((row) => (row.folder_id ? [[row.folder_id, row.items] as const] : [])));
    },
  };
}
