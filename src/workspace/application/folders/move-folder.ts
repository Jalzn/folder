import { reorderById } from '../../domain/order.js';
import { workspaceErrors } from '../errors.js';
import type { WorkspaceContext } from '../ports/context.js';
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
    if (input.beforeFolderId === folder.id) throw workspaceErrors.sameFolderReference();
    const folders = await repo.activeFolders(folder.projectId);
    const ordered = reorderById(folders, folder.id, input.beforeFolderId);
    if (!ordered) throw workspaceErrors.staleFolderReference();
    await renumberFolders(repo, ordered);
    return { folders: ordered.map((item, position) => ({ id: item.id, position })) };
  });
}
