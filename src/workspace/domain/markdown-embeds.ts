import { type EmbedKind, embedOf } from './embeds.js';
import { inlineMarkdown } from './markdown-inline.js';
import type { DocumentBlock } from './models.js';
import { visibleText } from './visible-text.js';

/**
 * How documentToMarkdown writes embeds: `resolve` gives an item's title, and a task's column, or
 * null when it is in the trash, deleted or never existed; `href` the link's destination, such as
 * `tinyfold:task/<id>` for the MCP or the item's address in an exported file. The caller resolves
 * every embed of the document beforehand, in one read.
 */
export interface EmbedResolver {
  resolve(kind: EmbedKind, id: string): { title: string; column?: string } | null;
  href(kind: EmbedKind, id: string): string;
}

/** What an embed reads as when its item is not available, or with no resolver at all. */
export const UNAVAILABLE_EMBED = '[Item indisponível]';

/** A title or name on the link's single line: without hidden characters, its whitespace one space. */
const oneLine = (text: string) => visibleText(text).replace(/\s+/gu, ' ').trim();

/**
 * An embed's line: `[Tarefa: <title> (<column>)](<href>)` or `[Desenho: <title>](<href>)`, with the
 * label escaped as any link text, or `[Item indisponível]`.
 */
export function embedLine(block: DocumentBlock, resolver: EmbedResolver | undefined): string {
  const embed = embedOf(block);
  const item = embed && resolver ? resolver.resolve(embed.kind, embed.id) : null;
  if (!embed || !resolver || !item) return UNAVAILABLE_EMBED;
  const title = oneLine(item.title) || 'Sem título';
  const label =
    embed.kind === 'task' ? `Tarefa: ${title}${item.column ? ` (${oneLine(item.column)})` : ''}` : `Desenho: ${title}`;
  const link = {
    type: 'link',
    href: resolver.href(embed.kind, embed.id),
    content: [{ type: 'text', text: label, styles: {} }],
  };
  return inlineMarkdown([link], { lineStart: true });
}
