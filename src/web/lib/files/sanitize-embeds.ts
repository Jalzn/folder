import { type DocumentBlock, EMBED_TYPES, readDocumentContent } from '#rich-text/domain';

const embedTypes: ReadonlySet<string> = new Set(EMBED_TYPES);

/**
 * Whether an embed block holds what the server takes (Sec R1): its one prop, an item ID of the domain's form
 * (EMBED_ID, lowercase UUID), as the domain's own reader checks it. A pasted `blocknote/html` can bring any
 * text there, which the server refuses, for the whole document and for the whole list of embeds.
 */
export function validEmbed(block: Pick<DocumentBlock, 'type' | 'props'>): boolean {
  try {
    readDocumentContent([{ type: block.type, props: block.props ?? {} }], {}, { embeds: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * The blocks as the server takes their embeds, at every depth:
 * - an embed with an ID the server refuses goes, with nothing in its place: it never named an item (Sec R1);
 * - an embed's children, which the server refuses ("Um item incorporado não tem blocos internos"), come out
 *   right after it as its siblings, in their order (review A1).
 * It runs on every snapshot the document saves and on a stored draft before it is read, so a document a Tab
 * or a paste once broke saves again and its draft opens. Anything else comes back as it was, the same array
 * when nothing changed; a block that is not an object is left for the validator.
 */
export function sanitizeEmbeds(blocks: readonly DocumentBlock[]): DocumentBlock[] {
  let changed = false;
  const result: DocumentBlock[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      result.push(block);
      continue;
    }
    const nested = Array.isArray(block.children) && block.children.length > 0 ? block.children : null;
    const children = nested ? sanitizeEmbeds(nested) : null;
    if (embedTypes.has(block.type)) {
      const lifted = children ?? [];
      if (!validEmbed(block)) {
        changed = true;
        result.push(...lifted);
      } else if (lifted.length) {
        changed = true;
        result.push({ ...block, children: [] }, ...lifted);
      } else result.push(block);
    } else if (children && children !== nested) {
      changed = true;
      result.push({ ...block, children });
    } else result.push(block);
  }
  return changed ? result : (blocks as DocumentBlock[]);
}
