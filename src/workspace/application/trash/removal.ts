import { AppError } from '@tinyfold/core/application';
import type { IsoInstant } from '@tinyfold/core/domain';
import { workspaceErrors } from '../errors.js';
import type { WorkspaceContext, WorkspaceRepository } from '../ports/context.js';
import type { PurgeItemInput } from '../schemas/trash.js';
import { assertVersion } from '../version.js';

/** What deleting an item for good needs to know of it, whatever its type. */
export interface TrashedItem {
  id: string;
  title: string;
  projectId: string | null;
  version: number;
  deletedAt: IsoInstant | null;
}

/** How to find an item of one type and delete it for good, with whatever must outlive it. */
export interface ItemRemoval {
  find(repo: WorkspaceRepository, id: string): Promise<TrashedItem | undefined>;
  remove(repo: WorkspaceRepository, item: TrashedItem): Promise<void>;
  /** The answer when no item has the ID. */
  missing: string;
}

/**
 * Deletes an item for good. Only an item in the trash, at the version the caller saw, can go. The
 * answer is just its ID, which is all the request record keeps.
 */
export function purgeTrashedItem(
  ctx: WorkspaceContext,
  operation: string,
  removal: ItemRemoval,
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
