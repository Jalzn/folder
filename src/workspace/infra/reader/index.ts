import { type Database, tables } from '@tinyfold/core/infra';
import type { WorkspaceReader } from '../../application/reading/ports.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { canvasReads } from './canvases.js';
import { documentReads } from './documents.js';
import { embedReads } from './embeds.js';
import { folderReads } from './folders.js';
import { projectReads } from './projects.js';
import { searchReads } from './search.js';
import { taskReads } from './tasks.js';

/** The agent read model's queries bound to one connection or transaction. */
export function workspaceReader(connection: Database): WorkspaceReader {
  const db = tables<WorkspaceTables>(connection);
  return {
    ...projectReads(db),
    ...searchReads(db),
    ...documentReads(db),
    ...canvasReads(db),
    ...taskReads(db),
    ...folderReads(db),
    ...embedReads(db),
  };
}
