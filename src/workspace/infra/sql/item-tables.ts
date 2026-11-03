import type { Kysely } from 'kysely';
import type { ItemType } from '../../domain/items.js';
import type { WorkspaceTables } from './tables.js';

/** The table that stores each type of item. */
const itemTables = {
  document: 'workspace_documents',
  drawing: 'workspace_canvases',
  task: 'workspace_tasks',
} as const satisfies Record<ItemType, keyof WorkspaceTables>;

export type { ItemType };

/**
 * The table of an item type as `item`. With a union of types, queries can only name the columns
 * their tables share, so renaming one in any of them fails to typecheck.
 */
export const itemTable = <Type extends ItemType>(db: Kysely<WorkspaceTables>, type: Type) =>
  db.dynamic.table(itemTables[type]).as('item');
