import { api, requestId } from '../../lib/api';
import type { ItemType } from '../../lib/types';

/**
 * Moves a document or drawing to another active project with a save of its current content, which the
 * server versions as any edit; moving clears the item's pin. An editor open on the item in this tab takes
 * the new version as it takes a change from another device.
 */
export async function moveItem(type: ItemType, id: string, projectId: string) {
  if (type === 'document') {
    const document = await api.workspace.getDocument({ id });
    await api.workspace.saveDocument({
      id,
      title: document.title,
      content: document.content,
      projectId,
      expectedVersion: document.version,
      requestId: requestId(),
    });
    return { title: document.title, pinned: document.pinnedAt !== null, from: document.projectId };
  }
  const canvas = await api.workspace.getCanvas({ id });
  await api.workspace.saveCanvas({
    id,
    title: canvas.title,
    scene: canvas.scene,
    projectId,
    expectedVersion: canvas.version,
    requestId: requestId(),
  });
  return { title: canvas.title, pinned: canvas.pinnedAt !== null, from: canvas.projectId };
}
