import { type Database, tables } from '@tinyfold/core/infra';
import type { DrawingPreviewPolicy } from '../../application/embeds/ports.js';
import type { WorkspaceReader } from '../../application/reading/ports.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { documentReads } from './documents.js';
import { embedReads } from './embeds.js';
import { folderReads } from './folders.js';
import { projectReads } from './projects.js';
import { searchReads } from './search.js';

/** The agent read model's queries bound to one connection or transaction. */
export function workspaceReader(connection: Database, previewPolicy: DrawingPreviewPolicy): WorkspaceReader {
  const db = tables<WorkspaceTables>(connection);
  return {
    ...projectReads(db),
    ...searchReads(db),
    ...documentReads(db),
    ...folderReads(db),
    ...embedReads(db, previewPolicy),
  };
}
