import { assertVersion } from '#core/application';
import type { ProjectsContext } from '../ports/context.js';
import type { RenameFolderInput } from '../schemas/folders.js';
import { assertFolderNameFree, readFolderName, requireActiveFolder, requireProjectForFolders } from './folder-rules.js';

/** Renames an active folder; the same name in another case or accent is the folder's own. */
export function renameFolder(ctx: ProjectsContext, input: RenameFolderInput) {
  return ctx.write('workspace.renameFolder', input, async (repo) => {
    const folder = await requireActiveFolder(repo, input.id);
    assertVersion(folder.version, input.expectedVersion);
    await requireProjectForFolders(repo, folder.projectId);
    const name = readFolderName(input.name);
    assertFolderNameFree(await repo.activeFolders(folder.projectId), name, folder.id);
    const version = folder.version + 1;
    await repo.saveFolder({ ...folder, name, version, updatedAt: ctx.now() }, folder.version);
    return { id: folder.id, version };
  });
}
