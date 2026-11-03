import { searchKey } from '../../domain/list-order.js';
import { readSearchCursor, SEARCH_ITEM_TYPES, searchCursor } from '../../domain/paging.js';
import { readClientCursor } from '../client-cursor.js';
import { workspaceErrors } from '../errors.js';
import { keysetPage } from './keyset-page.js';
import type { ReadingContext } from './ports.js';
import { queryTerms } from './query-terms.js';
import type { SearchInput } from './schemas.js';

/**
 * Finds documents, drawings and tasks that contain every word of the query, those with more of the
 * words in the title first, then the most recently edited; without a query, lists the most recent items.
 * A folder narrows it to the documents and drawings in that active folder.
 */
export async function search(ctx: ReadingContext, input: SearchInput) {
  const { cursor } = input;
  const after = cursor === undefined ? undefined : readClientCursor(() => readSearchCursor(cursor));
  const terms = queryTerms(input.query);
  const types = input.types ?? SEARCH_ITEM_TYPES;
  const page = await ctx.read(async (reader) => {
    if (input.folderId) {
      const folder = await reader.folder(input.folderId);
      if (!folder || folder.deleted) throw workspaceErrors.folderUnreadable();
      if (input.projectId && folder.projectId !== input.projectId) throw workspaceErrors.folderProjectMismatch();
    }
    return reader.searchItems({
      terms,
      projectId: input.projectId,
      folderId: input.folderId,
      // Tasks are never in folders.
      types: input.folderId ? types.filter((type) => type !== 'task') : types,
      limit: input.limit,
      after,
    });
  });
  return keysetPage(page, (hit) => searchCursor(searchKey(hit)));
}
