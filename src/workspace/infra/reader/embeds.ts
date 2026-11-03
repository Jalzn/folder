import type { Kysely } from 'kysely';
import type { DrawingPreviewPolicy, EmbedReader } from '../../application/embeds/ports.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { drawings, tasks } from './embed-items.js';

/**
 * The SQL of the embed states, shared by the editor's resolveEmbeds and the MCP's read_document: one
 * query per kind, whatever the number of embeds. A task or drawing in the trash is `trashed`, one
 * deleted for good or never there `missing`; a live one says its project, archived or not.
 */
export function embedReads(db: Kysely<WorkspaceTables>, previewPolicy: DrawingPreviewPolicy): EmbedReader {
  return {
    async embeds({ taskIds, canvasIds }) {
      return { tasks: await tasks(db, taskIds), drawings: await drawings(db, canvasIds, previewPolicy) };
    },
  };
}
