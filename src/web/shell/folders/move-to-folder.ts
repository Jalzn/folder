import { api, queryClient } from '../../lib/api';
import { onceMoreIfLost } from '../../lib/lost-answer';
import { canvasQuery, documentQuery } from '../../lib/queries';
import type { ItemType } from '../../lib/types';

/**
 * Files a document or drawing in a folder of its project, or at its root (`folderId` null). It carries no
 * content and is no edit, so no version is asked for and an open editor goes on saving; the open item's
 * query takes the folder and the pin the answer gives (docs/etapas/09-pastas.md, "Mover itens"). The tree
 * reads the move first, so it never shows the open item at its new place while it still lists it at the old
 * one.
 */
export async function moveToFolder(
  type: ItemType,
  id: string,
  projectId: string,
  folderId: string | null,
  requestId: string,
) {
  const moved = await onceMoreIfLost(() => api.workspace.moveItem({ type, id, projectId, folderId, requestId }));
  await queryClient.refetchQueries({ queryKey: ['workspace', 'navigation', projectId], type: 'active' });
  const key = type === 'document' ? documentQuery(id).queryKey : canvasQuery(id).queryKey;
  queryClient.setQueryData(key, (item: { folderId: string | null; pinnedAt: string | null } | undefined) =>
    item ? { ...item, folderId: moved.folderId, pinnedAt: moved.pinnedAt } : item,
  );
  return moved;
}
