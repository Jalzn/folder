import type { TrashPorts, WorkspaceFlowContext } from '../ports/context.js';
import type { PurgeItemInput } from '../schemas/trash.js';
import { type ItemRemoval, purgeTrashedItem } from './removal.js';

type DocumentPurgePorts = Pick<TrashPorts, 'findDocument' | 'keepTitleInSources' | 'deleteDocumentRow'>;

/** Tasks created from the document outlive it: their sources keep its title and excerpt, with no document. */
export const documentRemoval: ItemRemoval<DocumentPurgePorts> = {
  find: (repo, id) => repo.findDocument(id),
  async remove(repo, document) {
    await repo.keepTitleInSources(document.id, document.title);
    await repo.deleteDocumentRow(document.id);
  },
  missing: 'O documento não foi encontrado.',
};

export const purgeDocument = (ctx: WorkspaceFlowContext<DocumentPurgePorts>, input: PurgeItemInput) =>
  purgeTrashedItem(ctx, 'workspace.purgeDocument', documentRemoval, input);
