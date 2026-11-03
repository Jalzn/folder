import type { FiledItemType } from '../../domain/items.js';
import { workspaceErrors } from '../errors.js';
import type { FolderLifecyclePorts } from '../ports/context.js';

const missingItem = { document: workspaceErrors.documentMissing, drawing: workspaceErrors.drawingMissing };
export async function requireItem(
  repo: Pick<FolderLifecyclePorts, 'findItem'>,
  type: FiledItemType,
  id: string,
  includeDeleted = false,
) {
  const item = await repo.findItem(type, id);
  if (!item || (!includeDeleted && item.deletedAt)) throw missingItem[type]();
  return item;
}
export const requireLiveItem = (repo: Pick<FolderLifecyclePorts, 'findItem'>, type: FiledItemType, id: string) =>
  requireItem(repo, type, id);
