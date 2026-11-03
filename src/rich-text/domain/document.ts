import type { JsonValue } from '@tinyfold/core/domain';
import { object } from '@tinyfold/core/domain';
import type { DocumentBlock } from './document-models.js';
import { isEmbedType } from './embeds.js';

function inlineText(content: JsonValue | undefined): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => {
      if (!object(item)) return '';
      if (item.type === 'math' && typeof item.content === 'string') return item.content;
      return item.type === 'text' && typeof item.text === 'string'
        ? item.text
        : inlineText(item.content as JsonValue | undefined);
    })
    .join('');
}

/** A document's text, a line per block, children included; embeds have none and add no line. */
export function documentPlainText(blocks: readonly DocumentBlock[]): string {
  return blocks
    .filter((block) => !isEmbedType(block.type))
    .flatMap((block) => [
      inlineText(block.content),
      ...(block.children?.length ? [documentPlainText(block.children)] : []),
    ])
    .join('\n');
}

/** Every block in reading order: each one, then its children. */
function* eachBlock(blocks: readonly DocumentBlock[]): Generator<DocumentBlock> {
  for (const block of blocks) {
    yield block;
    if (block.children) yield* eachBlock(block.children);
  }
}

/**
 * The text a document opens with, for the overview's excerpt: its first block with text that is
 * not a heading or, in a document of headings only, its headings, a line each.
 */
export function documentLead(blocks: readonly DocumentBlock[]): string {
  const headings: string[] = [];
  for (const block of eachBlock(blocks)) {
    const text = inlineText(block.content);
    if (!text.trim()) continue;
    if (block.type !== 'heading') return text;
    headings.push(text);
  }
  return headings.join('\n');
}

/**
 * The blocks with an id each, the ones they have kept. The editor gives every block an id, and a task
 * made from a selection points at it, so a block saved without one would get a new id each time the
 * editor opens the document and the task would point at a block the server does not have. Content
 * from elsewhere (a Markdown import splitting a block around a formula, a script, an API client) can
 * come without them. Returns the same array when nothing is missing.
 */
export function withBlockIds(blocks: DocumentBlock[], newId: () => string): DocumentBlock[] {
  const taken = new Set<string>();
  let missing = false;
  for (const block of eachBlock(blocks)) {
    if (block.id === undefined) missing = true;
    else taken.add(block.id);
  }
  if (!missing) return blocks;
  const freshId = () => {
    let id = newId();
    while (taken.has(id)) id = newId();
    taken.add(id);
    return id;
  };
  const fill = (list: DocumentBlock[]): DocumentBlock[] =>
    list.map((block) => ({
      ...block,
      id: block.id ?? freshId(),
      ...(block.children ? { children: fill(block.children) } : {}),
    }));
  return fill(blocks);
}

export function findBlock(blocks: readonly DocumentBlock[], id: string): DocumentBlock | undefined {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children) {
      const child = findBlock(block.children, id);
      if (child) return child;
    }
  }
  return undefined;
}
export {
  type DocumentContentLimits,
  type DocumentContentOptions,
  MAX_DOCUMENT_BLOCKS,
  MAX_DOCUMENT_BYTES,
  RECOVERY_DOCUMENT_LIMITS,
  readDocumentContent,
} from './document-validation.js';
