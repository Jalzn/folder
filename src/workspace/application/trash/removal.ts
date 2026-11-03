import { AppError, assertVersion } from '@tinyfold/core/application';
import { workspaceErrors } from '../errors.js';
import type { TrashedItem, TrashPorts, WorkspaceFlowContext } from '../ports/context.js';
import type { PurgeItemInput } from '../schemas/trash.js';

/** How to find an item of one type and delete it for good, with whatever must outlive it. */
export interface ItemRemoval<Ports extends object = TrashPorts> {
  find(repo: Ports, id: string): Promise<TrashedItem | undefined>;
  remove(repo: Ports, item: TrashedItem): Promise<void>;
  /** The answer when no item has the ID. */
  missing: string;
}

/**
 * Deletes an item for good. Only an item in the trash, at the version the caller saw, can go. The
 * answer is just its ID, which is all the request record keeps.
 */
export function purgeTrashedItem<Ports extends object>(
  ctx: WorkspaceFlowContext<Ports>,
  operation: string,
  removal: ItemRemoval<Ports>,
  input: PurgeItemInput,
): Promise<{ id: string }> {
  return ctx.write(operation, input, async (repo) => {
    const item = await removal.find(repo, input.id);
    if (!item) throw new AppError('NOT_FOUND', removal.missing);
    assertVersion(item.version, input.expectedVersion);
    if (!item.deletedAt) throw workspaceErrors.itemNotTrashed();
    await removal.remove(repo, item);
    return { id: item.id };
  });
}
