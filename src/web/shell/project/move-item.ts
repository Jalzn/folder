import { api, queryClient } from '../../lib/api';
import { openEditor } from '../../lib/autosave/save-registry';
import { Refusal } from '../../lib/errors';
import { canvasQuery, documentQuery } from '../../lib/queries';
import type { ItemType } from '../../lib/types';
import type { RequestFor } from '../../lib/writes/use-request';

/**
 * Moves a document or drawing to another active project with moveItem, which carries no content and is
 * not an edit. An item open in an editor of this tab saves its pending edits first and takes the version
 * and project the move answers, so its next save goes on in the new project.
 */
export async function moveItem(type: ItemType, id: string, projectId: string, requestFor: RequestFor) {
  const item =
    type === 'document'
      ? await queryClient.fetchQuery({ ...documentQuery(id), staleTime: 0 })
      : await queryClient.fetchQuery({ ...canvasQuery(id), staleTime: 0 });
  const move = (expectedVersion: number) => {
    const input = { type, id, projectId, expectedVersion };
    return api.workspace.moveItem({ ...input, requestId: requestFor(input) });
  };
  const editor = openEditor(type, id);
  if (editor) {
    if (!(await editor.moveTo(move))) throw new Refusal('Resolva o salvamento deste item antes de movê-lo de projeto.');
  } else await move(item.version);
  return { title: item.title, pinned: item.pinnedAt !== null, from: item.projectId, folderId: item.folderId };
}
