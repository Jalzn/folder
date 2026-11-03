import type { IsoInstant } from '#core/domain';
import { queryClient } from '../api';
import type { Document } from '../types';
import { keys } from './keys';

/**
 * The cache's few direct writes (WF-2). The app never updates it ahead of the server: it applies what the
 * server answered, and refreshes the rest (refreshWorkspace).
 */

/** Where an open document or drawing now lives, from a move's answer, while the editor keeps its text. */
export function patchItemPlace(
  type: Parameters<typeof keys.item>[0],
  id: string,
  place: Pick<Document, 'folderId' | 'pinnedAt'>,
) {
  queryClient.setQueryData(keys.item(type, id), (item: Pick<Document, 'folderId' | 'pinnedAt'> | undefined) =>
    item ? { ...item, folderId: place.folderId, pinnedAt: place.pinnedAt } : item,
  );
}

/** Whether the open document or drawing is pinned, as the cache holds it. */
export const isItemPinned = (type: Parameters<typeof keys.item>[0], id: string) =>
  Boolean(queryClient.getQueryData<{ pinnedAt: IsoInstant | null }>(keys.item(type, id))?.pinnedAt);

/** The sidebar and the overview of every project, which a move or a save changes. */
export function invalidateNavigation() {
  void queryClient.invalidateQueries({ queryKey: keys.navigation() });
  void queryClient.invalidateQueries({ queryKey: keys.overview() });
}
