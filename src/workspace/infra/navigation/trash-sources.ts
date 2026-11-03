import type { IsoInstant } from '@tinyfold/core/domain';
import { type Kysely, sql } from 'kysely';
import type { TrashItemType } from '../../application/schemas/trash.js';
import { itemTable } from '../sql/item-tables.js';
import type { WorkspaceTables } from '../sql/tables.js';
export function trashSources(db: Kysely<WorkspaceTables>) {
  /** One type's items in the project's trash, in the columns every type shares. */
  const trashed = (projectId: string, type: TrashItemType) =>
    db
      .selectFrom(itemTable(db, type))
      .select([sql<TrashItemType>`${type}`.as('type'), 'item.id', 'item.title', 'item.version', 'item.deleted_at'])
      .where('item.project_id', '=', projectId)
      .where('item.deleted_at', 'is not', null)
      .$narrowType<{ deleted_at: IsoInstant }>();
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
      .$narrowType<{ deleted_at: IsoInstant }>();
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
      .$narrowType<{ deleted_at: IsoInstant }>();

  return { trashed, withFolder, tasks };
}
