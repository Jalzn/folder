import { type Database, tables } from '@tinyfold/core/infra';
import type { MoveRepository } from '../../application/ports/moves.js';
import { itemTable } from '../sql/item-tables.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { versionedUpdate } from './versioned-update.js';

export function moveRepository(connection: Database): MoveRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async moveItem({ type, id, projectId, expectedVersion }) {
      await versionedUpdate(
        db
          .updateTable(itemTable(db, type))
          // A folder belongs to one project, so the item leaves it for the new project's root.
          .set({ project_id: projectId, folder_id: null, pinned_at: null, version: expectedVersion + 1 }),
        { id: id, expectedVersion: expectedVersion, idColumn: 'item.id', versionColumn: 'item.version' },
      );
    },
  };
}
