import { AppError } from '@tinyfold/core/application';
import type { FiledItemType } from '../../domain/items.js';
import type { FolderRepository } from '../ports/folders.js';

const missingItem = { document: 'O documento não está disponível.', drawing: 'O desenho não está disponível.' };
export async function requireItem(
  repo: Pick<FolderRepository, 'findItem'>,
  type: FiledItemType,
  id: string,
  includeDeleted = false,
) {
  const item = await repo.findItem(type, id);
  if (!item || (!includeDeleted && item.deletedAt)) throw new AppError('NOT_FOUND', missingItem[type]);
  return item;
}
export const requireLiveItem = (repo: Pick<FolderRepository, 'findItem'>, type: FiledItemType, id: string) =>
  requireItem(repo, type, id);
