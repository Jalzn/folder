import { type Kysely, sql } from 'kysely';
import type { NavigationReader, TrashItem } from '../../application/navigation/ports.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { trashSources } from './trash-sources.js';

type TrashReads = Pick<NavigationReader, 'trashCount' | 'trashItems'>;

export function trashReads(db: Kysely<WorkspaceTables>): TrashReads {
  const { trashed, withFolder, tasks } = trashSources(db);

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
