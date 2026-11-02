import { type DocumentBlock, EMBED_TYPES } from '@tinyfold/workspace/domain';

const embedTypes: ReadonlySet<string> = new Set(EMBED_TYPES);

/**
 * The blocks with nothing nested under an embed, which the server refuses ("Um item incorporado não tem
 * blocos internos"): an embed's children come out right after it, as its siblings and in their order, at
 * every depth. It runs on every snapshot the document saves and on a stored draft before it is read, so a
 * document that a Tab once nested under a card saves again and its draft opens. Anything else comes back
 * as it was, the same array when nothing moved; a block that is not an object is left for the validator.
 */
export function liftEmbedChildren(blocks: readonly DocumentBlock[]): DocumentBlock[] {
  let moved = false;
  const result: DocumentBlock[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object' || !Array.isArray(block.children) || !block.children.length) {
      result.push(block);
      continue;
    }
    const children = liftEmbedChildren(block.children);
    if (embedTypes.has(block.type)) {
      moved = true;
      result.push({ ...block, children: [] }, ...children);
    } else if (children !== block.children) {
      moved = true;
      result.push({ ...block, children });
    } else result.push(block);
  }
  return moved ? result : (blocks as DocumentBlock[]);
}
