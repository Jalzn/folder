import type { WorkspaceContext } from '../ports/context.js';
import type { CreateFolderInput } from '../schemas/folders.js';
import {
  assertFolderNameFree,
  assertRoomForFolder,
  readFolderName,
  renumberFolders,
  requireProjectForFolders,
} from './folder-rules.js';

/** A new folder goes to the top of the project's folders, and the others move down one. */
export function createFolder(ctx: WorkspaceContext, input: CreateFolderInput) {
  return ctx.write('workspace.createFolder', input, async (repo) => {
    const project = await requireProjectForFolders(repo, input.projectId);
    const name = readFolderName(input.name);
    const folders = await repo.activeFolders(project.id);
    assertFolderNameFree(folders, name);
    assertRoomForFolder(folders);
    const now = ctx.now();
    const folder = {
      id: ctx.newId(),
      projectId: project.id,
      name,
      position: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await repo.insertFolder(folder);
    await renumberFolders(repo, [folder, ...folders]);
    return { id: folder.id, version: folder.version, position: folder.position };
  });
}
