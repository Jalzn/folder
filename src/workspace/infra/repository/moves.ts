import { type Database, tables } from '@tinyfold/core/infra';
import type { MoveRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';
import { itemTable } from '../item-tables.js';
import { expectUpdated } from './versioned-update.js';

export function moveRepository(connection: Database): MoveRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async moveItem(type, id, projectId, expectedVersion) {
      const result = await db
        .updateTable(itemTable(db, type))
        // A folder belongs to one project, so the item leaves it for the new project's root.
        .set({ project_id: projectId, folder_id: null, pinned_at: null, version: expectedVersion + 1 })
        .where('item.id', '=', id)
        .where('item.version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
  };
}
