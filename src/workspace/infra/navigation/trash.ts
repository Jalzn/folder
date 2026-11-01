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
  /** Documents and drawings keep their folder in the trash, as their origin; tasks have none. */
  const withFolder = (projectId: string, type: 'document' | 'drawing') =>
    db
      .selectFrom(itemTable(db, type))
      .select([
        sql<TrashItemType>`${type}`.as('type'),
        'item.id',
        'item.title',
        'item.version',
        'item.deleted_at',
        'item.folder_id',
      ])
      .where('item.project_id', '=', projectId)
      .where('item.deleted_at', 'is not', null)
      .$narrowType<{ deleted_at: string }>();
  const tasks = (projectId: string) =>
    db
      .selectFrom('workspace_tasks as item')
      .select([
        sql<TrashItemType>`'task'`.as('type'),
        'item.id',
        'item.title',
        'item.version',
        'item.deleted_at',
        sql<string | null>`null`.as('folder_id'),
      ])
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
      const rows = await db
        .selectFrom(
          withFolder(projectId, 'document')
            .unionAll(withFolder(projectId, 'drawing'))
            .unionAll(tasks(projectId))
            .as('trashed'),
        )
        .leftJoin('workspace_folders as folder', 'folder.id', 'trashed.folder_id')
        .select([
          'trashed.type',
          'trashed.id',
          'trashed.title',
          'trashed.version',
          'trashed.deleted_at',
          'folder.id as folder_id',
          'folder.name as folder_name',
          'folder.deleted_at as folder_deleted_at',
        ])
        .orderBy('trashed.deleted_at', 'desc')
        .orderBy('trashed.id')
        .limit(limit)
        .execute();
      return rows.map(
        (row): TrashItem => ({
          type: row.type,
          id: row.id,
          title: row.title,
          version: row.version,
          deletedAt: row.deleted_at,
          folder:
            row.folder_id && row.folder_name
              ? { id: row.folder_id, name: row.folder_name, deleted: row.folder_deleted_at !== null }
              : null,
        }),
      );
    },
  };
}
