import { api, requestId } from '../../../lib/api';
import type { TrashItem } from '../../../lib/queries';
import { paths } from '../../../router/paths';

const edit = (item: TrashItem) => ({ id: item.id, expectedVersion: item.version, requestId: requestId() });

/** Puts an item back in its project, at the version the trash showed. */
export async function restoreItem(item: TrashItem) {
  if (item.type === 'document') await api.workspace.restoreDocument(edit(item));
  else if (item.type === 'drawing') await api.workspace.restoreCanvas(edit(item));
  else await api.workspace.restoreTask(edit(item));
}

/** Deletes an item for good. It must still be in the trash, at the version the trash showed. */
export async function purgeItem(item: TrashItem) {
  if (item.type === 'document') await api.workspace.purgeDocument(edit(item));
  else if (item.type === 'drawing') await api.workspace.purgeCanvas(edit(item));
  else await api.workspace.purgeTask(edit(item));
}

/** Deletes exactly the items shown; one restored or changed elsewhere meanwhile is skipped. */
export function emptyTrash(projectId: string, items: readonly TrashItem[]) {
  return api.workspace.emptyTrash({
    requestId: requestId(),
    projectId,
    items: items.map((item) => ({ type: item.type, id: item.id, version: item.version })),
  });
}

/** Whether tasks were created from a document's excerpts; they outlive the document, excerpt kept. */
export async function hasOriginatedTasks(item: TrashItem) {
  if (item.type !== 'document') return false;
  const { tasks } = await api.workspace.listTasks({ documentId: item.id });
  return tasks.length > 0;
}

/** Where a restored item opens: its page, or the board with a task's dialog. */
export function itemAddress(projectId: string, item: TrashItem) {
  return item.type === 'task' ? paths.task(projectId, item.id) : paths.item(projectId, item.type, item.id);
}
