import { AppError } from '@tinyfold/core/application';
import { reorder } from '../../domain/order.js';
import type { WorkspaceContext } from '../ports.js';
import type { MoveFolderInput } from '../schemas/folders.js';
import { renumberFolders, requireActiveFolder, requireProjectForFolders } from './folder-rules.js';

/**
 * Places an active folder before another of its project, or at the end with null, and numbers the
 * folders again. The order is not an edit: versions and dates stay, and the last move wins.
 */
export function moveFolder(ctx: WorkspaceContext, input: MoveFolderInput) {
  return ctx.write('workspace.moveFolder', input, async (repo) => {
    const folder = await requireActiveFolder(repo, input.id);
    await requireProjectForFolders(repo, folder.projectId);
    if (input.beforeFolderId === folder.id) throw new AppError('VALIDATION', 'Escolha outra pasta como referência.');
    const folders = await repo.activeFolders(folder.projectId);
    const order = reorder(
      folders.map((item) => item.id),
      folder.id,
      input.beforeFolderId,
    );
    if (!order) throw new AppError('VERSION_CONFLICT', 'A pasta de referência não está mais entre as do projeto.');
    const byId = new Map(folders.map((item) => [item.id, item]));
    const ordered = order.flatMap((id) => byId.get(id) ?? []);
    await renumberFolders(repo, ordered);
    return { folders: ordered.map((item, position) => ({ id: item.id, position })) };
  });
}
