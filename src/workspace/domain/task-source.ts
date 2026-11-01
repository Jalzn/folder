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

/**
 * Where an excerpt ends in a block's text, as an index into that text just after its last
 * character, or undefined when the block no longer has it. Whitespace runs match as one space, as in
 * excerptPresent, so a reflowed excerpt is still found; with the excerpt twice, the first counts.
 * The origin marker sits there (stage 11, decision 8).
 */
export function excerptEnd(text: string, excerpt: string): number | undefined {
  const target = collapseSpaces(excerpt);
  if (!target) return undefined;
  // The text with each whitespace run as one space, and the index each of its characters came from.
  let normalized = '';
  const origin: number[] = [];
  let space = -1;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] as string;
    if (/\s/u.test(character)) {
      if (normalized && space < 0) space = index;
      continue;
    }
    if (space >= 0) {
      normalized += ' ';
      origin.push(space);
      space = -1;
    }
    normalized += character;
    origin.push(index);
  }
  const at = normalized.indexOf(target);
  if (at < 0) return undefined;
  return (origin[at + target.length - 1] as number) + 1;
}
