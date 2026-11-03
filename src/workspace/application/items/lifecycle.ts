import type { FiledItemType, ItemAck, RestoreAck } from '../../domain/items.js';
import { folderAfterRestore } from '../folders/folder-rules.js';
import type { WorkspaceRepository } from '../ports/context.js';
import { assertVersion } from '../version.js';
import { requireItem } from './require-item.js';

interface ItemWrite {
  id: string;
  expectedVersion: number;
}
export const itemAck = (id: string, version: number, updatedAt: string): ItemAck => ({ id, version, updatedAt });
export async function trashItem(
  repo: WorkspaceRepository,
  type: FiledItemType,
  input: ItemWrite,
  now: () => string,
): Promise<ItemAck> {
  const item = await requireItem(repo, type, input.id, true);
  assertVersion(item.version, input.expectedVersion);
  const updatedAt = now();
  await repo.trashItem(type, item.id, updatedAt, item.version);
  return itemAck(item.id, item.version + 1, updatedAt);
}
export async function restoreItem(
  repo: WorkspaceRepository,
  type: FiledItemType,
  input: ItemWrite,
  now: () => string,
): Promise<RestoreAck> {
  const item = await requireItem(repo, type, input.id, true);
  assertVersion(item.version, input.expectedVersion);
  const updatedAt = now();
  const { folderId, folderGone } = await folderAfterRestore(repo, item.folderId);
  await repo.restoreItem(type, item.id, { folderId, pinnedAt: item.pinnedAt }, updatedAt, item.version);
  return { ...itemAck(item.id, item.version + 1, updatedAt), folderGone };
}
