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
        .set({ project_id: projectId, pinned_at: null, version: expectedVersion + 1 })
        .where('item.id', '=', id)
        .where('item.version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
  };
}
