import { api } from '../../../lib/api';
import type { TrashItem } from '../../../lib/queries';
import { paths } from '../../../router/paths';

/** One user intent's request: a retry sends the same id, so the server replays its first answer. */
export type RequestFor = (input: unknown) => string;

const edit = (item: TrashItem, requestFor: RequestFor) => {
  const input = { id: item.id, expectedVersion: item.version };
  return { ...input, requestId: requestFor({ type: item.type, ...input }) };
};

/** Puts an item back in its project, at the version the trash showed. */
export async function restoreItem(item: TrashItem, requestFor: RequestFor) {
  if (item.type === 'document') await api.workspace.restoreDocument(edit(item, requestFor));
  else if (item.type === 'drawing') await api.workspace.restoreCanvas(edit(item, requestFor));
  else await api.workspace.restoreTask(edit(item, requestFor));
}

/** Deletes an item for good. It must still be in the trash, at the version the trash showed. */
export async function purgeItem(item: TrashItem, requestFor: RequestFor) {
  if (item.type === 'document') await api.workspace.purgeDocument(edit(item, requestFor));
  else if (item.type === 'drawing') await api.workspace.purgeCanvas(edit(item, requestFor));
  else await api.workspace.purgeTask(edit(item, requestFor));
}

/** Deletes exactly the items shown, at most one listing; one restored or changed elsewhere is skipped. */
export function emptyTrash(projectId: string, shown: readonly TrashItem[], requestFor: RequestFor) {
  const items = shown.map((item) => ({ type: item.type, id: item.id, version: item.version }));
  return api.workspace.emptyTrash({ requestId: requestFor({ projectId, items }), projectId, items });
}

/**
 * How many of the items an emptying skipped still exist: restored into the project or back in the trash
 * at another version. Items already gone, deleted for good elsewhere, are not "kept".
 */
export async function keptAfterEmptying(projectId: string, shown: readonly TrashItem[]) {
  const [trash, documents, drawings, { tasks }] = await Promise.all([
    api.workspace.listTrash({ projectId }),
    api.workspace.listDocuments({ projectId }),
    api.workspace.listCanvases({ projectId }),
    api.workspace.listTasks({ projectId }),
  ]);
  const existing = new Set([
    ...trash.items.map((item) => `${item.type}:${item.id}`),
    ...documents.map((item) => `document:${item.id}`),
    ...drawings.map((item) => `drawing:${item.id}`),
    ...tasks.map((item) => `task:${item.id}`),
  ]);
  return shown.filter((item) => existing.has(`${item.type}:${item.id}`)).length;
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
