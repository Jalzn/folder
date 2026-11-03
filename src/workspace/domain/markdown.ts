import type { DocumentBlock } from './document-models.js';
import { isEmbedType } from './embeds.js';
import type { JsonValue } from './json.js';
import { type EmbedResolver, embedLine } from './markdown-embeds.js';
import { fenceFor } from './markdown-fence.js';
import { inlineMarkdown } from './markdown-inline.js';
import { displayMathLines } from './markdown-math.js';

/**
 * Serializes the persisted BlockNote subset (see readDocumentContent) to CommonMark with GFM task
 * lists and strikethrough, plus `$` math, in a form the BlockNote parser reads back. Underline,
 * colors and alignment have no Markdown form and are dropped. Task and drawing embeds become a line
 * with a link each, through `embeds` (see EmbedResolver): the MCP and the exported file share this
 * serializer and differ only in the links' destinations. Without a resolver, an embed reads as
 * unavailable.
 */
export function documentToMarkdown(blocks: readonly DocumentBlock[], options: { embeds?: EmbedResolver } = {}): string {
  const lines = renderBlocks(blocks, options.embeds);
  return lines.length ? `${lines.join('\n')}\n` : '';
}

type ListFamily = 'dash' | 'number';
const listFamily = (block: DocumentBlock): ListFamily | undefined =>
  block.type === 'bulletListItem' || block.type === 'checkListItem'
    ? 'dash'
    : block.type === 'numberedListItem'
      ? 'number'
      : undefined;

/** Markdown takes an ordered list's numbering from its first item; a comment ends the list to restart it. */
const LIST_BREAK = '<!-- -->';
/** CommonMark list numbers have at most nine digits and are never negative. */
const MAX_LIST_NUMBER = 999_999_999;

function listStart(block: DocumentBlock): number | undefined {
  const start = numericProp(block, 'start');
  return start === undefined ? undefined : Math.min(Math.max(start, 0), MAX_LIST_NUMBER);
}

function renderBlocks(blocks: readonly DocumentBlock[], embeds: EmbedResolver | undefined): string[] {
  const lines: string[] = [];
  let previousFamily: ListFamily | undefined;
  let nextNumber = 1;
  for (const block of blocks) {
    const family = listFamily(block);
    let marker = '';
    let restarts = false;
    if (family === 'number') {
      const start = listStart(block);
      const continues = previousFamily === 'number' && (start === undefined || start === nextNumber);
      restarts = previousFamily === 'number' && !continues;
      if (!continues) nextNumber = start ?? 1;
      marker = `${Math.min(nextNumber, MAX_LIST_NUMBER)}. `;
      nextNumber += 1;
    }
    const rendered = renderBlock(block, marker, embeds);
    if (!rendered.length) continue;
    if (restarts) lines.push('', LIST_BREAK);
    // Items of one list stay tight; any other neighbor needs a blank line so it is not read as a continuation.
    if (lines.length && (restarts || !family || family !== previousFamily)) lines.push('');
    lines.push(...rendered);
    previousFamily = family;
  }
  return lines;
}

function renderBlock(block: DocumentBlock, numberMarker: string, embeds: EmbedResolver | undefined): string[] {
  if (isEmbedType(block.type)) return [embedLine(block, embeds)];
  const children = block.children?.length ? renderBlocks(block.children, embeds) : [];
  switch (block.type) {
    case 'bulletListItem':
      return listItem('- ', block, children);
    case 'checkListItem':
      return listItem(block.props?.checked === true ? '- [x] ' : '- [ ] ', block, children);
    case 'numberedListItem':
      return listItem(numberMarker, block, children);
    case 'quote':
      return withChildren(prefixLines(inlineLines(block.content), '> ', '> '), children);
    case 'heading':
      return withChildren(heading(block), children);
    case 'codeBlock':
      return withChildren(codeFence(sourceText(block.content), stringProp(block, 'language')), children);
    case 'mathBlock':
      return withChildren(displayMathLines(sourceText(block.content)), children);
    default:
      return withChildren(inlineLines(block.content), children);
  }
}

/**
 * Markdown cannot nest blocks under a paragraph, heading, quote or code: their children follow at the
 * same level. (A paragraph inside a blockquote would be read back as part of the quote's text.)
 */
function withChildren(lines: string[], children: string[]): string[] {
  if (!children.length) return lines;
  if (!lines.length) return children;
  return [...lines, '', ...children];
}

/**
 * An item keeps its text on the marker's line, with `<br>` for line breaks: the BlockNote parser
 * takes only that line as the item's text. Children are indented to the content column, which for a
 * task item is the column after `- `. An empty item keeps the space after its marker, which the
 * BlockNote parser requires.
 */
function listItem(marker: string, block: DocumentBlock, children: string[]): string[] {
  const text = withoutIndentation(inlineMarkdown(block.content, { lineStart: true, breaks: 'html' }));
  const nested = children.length && !startsInterruptingList(children) ? ['', ...children] : children;
  const indent = ' '.repeat(block.type === 'checkListItem' ? 2 : marker.length);
  return [`${marker}${text.trim() ? text : ''}`, ...prefixLines(nested, indent, indent)];
}

/** Bullet lists and lists numbered from 1 may start right below a paragraph line; others need a blank line. */
function startsInterruptingList(lines: string[]): boolean {
  return /^(?:- |1\. )/u.test(lines[0] ?? '');
}

function prefixLines(lines: string[], first: string, rest: string): string[] {
  return lines.map((line, index) => {
    const prefix = index === 0 ? first : rest;
    return line ? `${prefix}${line}` : prefix.trimEnd();
  });
}

/** An empty heading has no Markdown form. A trailing `#` run is escaped so it is not read as a closing sequence. */
function heading(block: DocumentBlock): string[] {
  const level = Math.min(6, Math.max(1, numericProp(block, 'level') ?? 1));
  const text = inlineMarkdown(block.content, { lineStart: false, breaks: 'space' }).trim();
  return text ? [`${'#'.repeat(level)} ${text.replace(/(\s)(#+)$/u, '$1\\$2')}`] : [];
}

function codeFence(code: string, language: string | undefined): string[] {
  const normalized = code.replace(/\r\n?/gu, '\n');
  const fence = fenceFor(normalized, '`', 3);
  return [`${fence}${language ?? ''}`, ...(normalized ? normalized.split('\n') : []), fence];
}

function inlineLines(content: JsonValue | undefined): string[] {
  const text = withoutIndentation(inlineMarkdown(content, { lineStart: true }));
  return text.trim() ? text.split('\n') : [];
}

/** Markdown cannot keep a block's leading indentation: four spaces would start a code block. */
const withoutIndentation = (text: string) => text.replace(/^[ \t]+/u, '');

function numericProp(block: DocumentBlock, name: string): number | undefined {
  const value = block.props?.[name];
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
}

function stringProp(block: DocumentBlock, name: string): string | undefined {
  const value = block.props?.[name];
  return typeof value === 'string' ? value : undefined;
}

/** Code and display math keep their source verbatim. */
function sourceText(content: JsonValue | undefined): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((item) =>
      item !== null && typeof item === 'object' && !Array.isArray(item) && typeof item.text === 'string'
        ? item.text
        : '',
    )
    .join('');
}
