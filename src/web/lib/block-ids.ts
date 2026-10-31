import type { DocumentBlock } from './types';

/**
 * Whether any block, nested ones included, was stored without an id. Documents imported before the server
 * filled ids in can lack them; a task made from a selection needs the id of its block.
 */
export function lacksBlockIds(blocks: readonly DocumentBlock[]): boolean {
  return blocks.some((block) => typeof block.id !== 'string' || lacksBlockIds(block.children ?? []));
}
