import { assertVersion, requireActiveProject, requireLiveItem } from './helpers.js';
import type { WorkspaceContext } from './ports.js';
import type { MoveItemInput } from './schemas/moves.js';

/** Where a moved item is now, and the version an open editor saves against from then on. */
export interface MovedItem {
  id: string;
  projectId: string;
  version: number;
}

/**
 * Moves a document or drawing to another active project, without its content. Moving is not an
 * edit: `updatedAt` stays, so the item keeps its place among the ones edited recently. The version
 * goes up, so an editor still saving with the old one learns about the move. The pin belonged to
 * the old project's sidebar and goes. Moving to the project the item is in changes nothing.
 */
export function moveItem(ctx: WorkspaceContext, input: MoveItemInput): Promise<MovedItem> {
  return ctx.write('workspace.moveItem', input, async (repo) => {
    const item = await requireLiveItem(repo, input.type, input.id);
    assertVersion(item.version, input.expectedVersion);
    if (item.projectId === input.projectId) return { id: item.id, projectId: item.projectId, version: item.version };
    const project = await requireActiveProject(repo, input.projectId);
    await repo.moveItem(input.type, item.id, project.id, item.version);
    return { id: item.id, projectId: project.id, version: item.version + 1 };
  });
}
