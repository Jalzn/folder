import { type Kysely, sql } from 'kysely';
import type { NavigationReader, TrashItem } from '../../application/navigation/ports.js';
import type { TrashItemType } from '../../application/schemas/trash.js';
import type { WorkspaceTables } from '../db.js';

type TrashReads = Pick<NavigationReader, 'trashItems'>;

const tables = {
  document: 'workspace_documents',
  drawing: 'workspace_canvases',
  task: 'workspace_tasks',
} as const satisfies Record<TrashItemType, keyof WorkspaceTables>;

export function trashReads(db: Kysely<WorkspaceTables>): TrashReads {
  /** One type's items in the project's trash, in the columns every type shares. */
  const trashed = (projectId: string, type: TrashItemType) =>
    db
      .selectFrom(db.dynamic.table(tables[type]).as('item'))
      .select([sql<TrashItemType>`${type}`.as('type'), 'item.id', 'item.title', 'item.version', 'item.deleted_at'])
      .where('item.project_id', '=', projectId)
      .where('item.deleted_at', 'is not', null)
      .$narrowType<{ deleted_at: string }>();

  return {
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
