import { requireProject } from '../helpers.js';
import type { FolderSummary, WorkspaceContext } from '../ports.js';
import type { ListFoldersInput } from '../schemas/folders.js';

/** The active folders of one project, or of every project, by project and position, with their items counted. */
export function listFolders(ctx: WorkspaceContext, input: ListFoldersInput): Promise<{ folders: FolderSummary[] }> {
  return ctx.read(async (repo) => {
    if (input.projectId) await requireProject(repo, input.projectId);
    return { folders: await repo.folderSummaries(input.projectId) };
  });
}
