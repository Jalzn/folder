import { type Database, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { FolderItem, FolderRepository } from '../../application/ports/folders.js';
import type { NavItemType } from '../../domain/navigation.js';
import type { WorkspaceTables } from '../db.js';
import { itemTable } from '../item-tables.js';
import { folderModel, folderRow } from './mappers.js';
import { expectUpdated } from './versioned-update.js';

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
  pinned_at: string | null;
  deleted_at: string | null;
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

export function folderRepository(connection: Database): FolderRepository {
  const db = tables<WorkspaceTables>(connection);
  /** Live documents and drawings counted per folder. */
  const liveItems = (type: NavItemType) =>
    db
      .selectFrom(itemTable(db, type))
      .select(['item.folder_id'])
      .where('item.deleted_at', 'is', null)
      .where('item.folder_id', 'is not', null);
  return {
    async findFolder(id) {
      const row = await db.selectFrom('workspace_folders').selectAll().where('id', '=', id).executeTakeFirst();
      return row && folderModel(row);
    },
    async activeFolders(projectId) {
      const rows = await db
        .selectFrom('workspace_folders')
        .selectAll()
        .where('project_id', '=', projectId)
        .where('deleted_at', 'is', null)
        .orderBy('position')
        .orderBy('id')
        .execute();
      return rows.map(folderModel);
    },
    async folderSummaries(projectId) {
      let query = db
        .selectFrom('workspace_folders as folder')
        .innerJoin('workspace_projects as project', 'project.id', 'folder.project_id')
        .leftJoin(
          (eb) =>
            eb
              .selectFrom(liveItems('document').unionAll(liveItems('drawing')).as('filed'))
              .select(['filed.folder_id', sql<number>`count(*)`.as('items')])
              .groupBy('filed.folder_id')
              .as('counts'),
          (join) => join.onRef('counts.folder_id', '=', 'folder.id'),
        )
        .select(['folder.id', 'folder.project_id', 'folder.name', 'folder.position', 'folder.version', 'counts.items'])
        .where('folder.deleted_at', 'is', null);
      if (projectId) query = query.where('folder.project_id', '=', projectId);
      const rows = await query.orderBy('project.position').orderBy('project.id').orderBy('folder.position').execute();
      return rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        position: row.position,
        version: row.version,
        items: row.items ?? 0,
      }));
    },
    async insertFolder(folder) {
      await db.insertInto('workspace_folders').values(folderRow(folder)).execute();
    },
    async saveFolder(folder, expectedVersion) {
      const result = await db
        .updateTable('workspace_folders')
        .set(folderRow(folder))
        .where('id', '=', folder.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
    async setFolderPosition(id, position) {
      await db.updateTable('workspace_folders').set({ position }).where('id', '=', id).execute();
    },
    async itemsInFolder(folderId) {
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
    async findItem(type, id) {
      const row = await db
        .selectFrom(itemTable(db, type))
        .select(itemColumns)
        .where('item.id', '=', id)
        .executeTakeFirst();
      return row && folderItem(type, row);
    },
    async placeItem(type, id, folderId, pinnedAt) {
      await db
        .updateTable(itemTable(db, type))
        .set({ folder_id: folderId, pinned_at: pinnedAt })
        .where('item.id', '=', id)
        .execute();
    },
    async trashItem(type, id, at, expectedVersion) {
      const result = await db
        .updateTable(itemTable(db, type))
        .set({ deleted_at: at, updated_at: at, pinned_at: null, version: expectedVersion + 1 })
        .where('item.id', '=', id)
        .where('item.version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
    async restoreItem(type, id, place, at, expectedVersion) {
      const result = await db
        .updateTable(itemTable(db, type))
        .set({
          deleted_at: null,
          updated_at: at,
          folder_id: place.folderId,
          pinned_at: place.pinnedAt,
          version: expectedVersion + 1,
        })
        .where('item.id', '=', id)
        .where('item.version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
  };
}
