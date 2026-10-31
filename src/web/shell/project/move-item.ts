import { api, requestId } from '../../lib/api';
import { type OpenEditor, openEditor } from '../../lib/save-registry';
import type { ItemType } from '../../lib/types';

async function moveOpenItem(editor: OpenEditor, projectId: string) {
  if (!(await editor.moveTo(projectId)))
    throw Object.assign(new Error('Resolva o salvamento deste item antes de movê-lo de projeto.'), {
      code: 'DOMAIN_RULE',
    });
}

/**
 * Moves a document or drawing to another active project with a save of its content, which the server
 * versions as any edit and which clears the item's pin. An item open in an editor of this tab moves through
 * that editor's autosave, with its unsaved edits; any other is read and saved as the server has it.
 */
export async function moveItem(type: ItemType, id: string, projectId: string) {
  const editor = openEditor(type, id);
  const item = type === 'document' ? await api.workspace.getDocument({ id }) : await api.workspace.getCanvas({ id });
  if (editor) await moveOpenItem(editor, projectId);
  else if ('content' in item)
    await api.workspace.saveDocument({
      id,
      title: item.title,
      content: item.content,
      projectId,
      expectedVersion: item.version,
      requestId: requestId(),
    });
  else
    await api.workspace.saveCanvas({
      id,
      title: item.title,
      scene: item.scene,
      projectId,
      expectedVersion: item.version,
      requestId: requestId(),
    });
  return { title: item.title, pinned: item.pinnedAt !== null, from: item.projectId };
}
