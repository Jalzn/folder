import { type Database, tables } from '@tinyfold/core/infra';
import type { NavigationReader } from '../../application/navigation/ports.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { overviewReads } from './overview.js';
import { projectReads } from './projects.js';
import { trashReads } from './trash.js';

/** The navigation queries bound to one connection or transaction. */
export function navigationReader(connection: Database): NavigationReader {
  const db = tables<WorkspaceTables>(connection);
  return {
    ...projectReads(db),
    ...overviewReads(db),
    ...trashReads(db),
  };
}
