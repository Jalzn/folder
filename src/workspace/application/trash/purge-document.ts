import type { WorkspaceContext } from '../ports.js';
import type { PurgeItemInput } from '../schemas/trash.js';
import { type ItemRemoval, purgeTrashedItem } from './removal.js';

/** Tasks created from the document outlive it: their sources keep its title and excerpt, with no document. */
export const documentRemoval: ItemRemoval = {
  find: (repo, id) => repo.findDocument(id),
  async remove(repo, document) {
    await repo.keepTitleInSources(document.id, document.title);
    await repo.deleteDocumentRow(document.id);
  },
  missing: 'O documento não foi encontrado.',
};

export const purgeDocument = (ctx: WorkspaceContext, input: PurgeItemInput) =>
  purgeTrashedItem(ctx, 'workspace.purgeDocument', documentRemoval, input);
