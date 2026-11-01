import { type Database, tables } from '@tinyfold/core/infra';
import type { LabelRepository } from '../../application/ports.js';
import type { WorkspaceTables } from '../db.js';
import { labelModel } from './mappers.js';

export function labelRepository(connection: Database): LabelRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async findLabels(ids) {
      if (!ids.length) return [];
      return (
        await db
          .selectFrom('workspace_labels')
          .selectAll()
          .where('id', 'in', [...ids])
          .execute()
      ).map(labelModel);
    },
  };
}
