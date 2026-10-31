import { documentPlainText, findBlock } from './document.js';
import type { Document } from './models.js';

const collapseSpaces = (text: string) => text.replace(/\s+/gu, ' ').trim();

/**
 * Whether a captured excerpt is still in its document: in the anchored block when the task has one,
 * otherwise anywhere in the text. Whitespace changes do not detach the excerpt.
 */
export function excerptPresent(
  document: Pick<Document, 'content' | 'plainText'>,
  blockId: string | null,
  excerpt: string,
): boolean {
  const block = blockId ? findBlock(document.content, blockId) : undefined;
  if (blockId && !block) return false;
  const text = block ? documentPlainText([block]) : document.plainText;
  return collapseSpaces(text).includes(collapseSpaces(excerpt));
}
