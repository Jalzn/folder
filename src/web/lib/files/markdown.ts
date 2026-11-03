import type { DocumentBlock, DocumentContent, JsonValue } from '@tinyfold/workspace/domain';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mathFromMarkdown } from 'mdast-util-math';
import { math } from 'micromark-extension-math';

interface SyntaxNode {
  type: string;
  value?: string | undefined;
  children?: SyntaxNode[] | undefined;
  position?: { start: { offset?: number | undefined }; end: { offset?: number | undefined } } | undefined;
}

interface Equation {
  start: number;
  end: number;
  kind: 'math' | 'inlineMath';
  source: string;
  token: string;
}

/** Literal text, or text BlockNote reads from HTML: no formulas and no escapes to resolve. */
const literalNodes = new Set(['image', 'imageReference', 'code', 'inlineCode', 'html']);
/** Link labels show their dollars as text, but their escapes are still resolved. */
const linkNodes = new Set(['link', 'linkReference']);
const asciiPunctuation = /[!-/:-@[-`{-~]/u;
/** BlockNote reads the content of these tags as Markdown, unlike other inline HTML. */
const emphasisTag = /^<\s*(\/?)\s*(strong|em|del)\s*>$/iu;
const voidTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function failedImport(): never {
  throw new Error('Não foi possível preservar todas as equações deste Markdown. O documento atual não foi alterado.');
}

function record(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value);
}

function continuationPrefix(prefix: string): string {
  return prefix.replace(/(?:[-+*]|\d+[.)])[ \t]+/gu, (marker) => ' '.repeat(marker.length));
}

/**
 * Offsets of the backslashes that escape a `$` in a text node. Dollars are escaped so they are not
 * read as math, but BlockNote has no math syntax and would keep the backslash as text.
 */
function dollarEscapes(markdown: string, text: SyntaxNode): number[] {
  const start = text.position?.start.offset ?? 0;
  const end = text.position?.end.offset ?? start;
  const offsets: number[] = [];
  for (let index = start; index < end - 1; index += 1) {
    if (markdown[index] !== '\\' || !asciiPunctuation.test(markdown.charAt(index + 1))) continue;
    if (markdown[index + 1] === '$') offsets.push(index);
    // The escaped character cannot start another escape.
    index += 1;
  }
  return offsets;
}

/** Replaces non-overlapping ranges of the source. */
function replaceRanges(source: string, ranges: { start: number; end: number; text: string }[]): string {
  let result = '';
  let offset = 0;
  for (const range of ranges.toSorted((a, b) => a.start - b.start)) {
    result += source.slice(offset, range.start) + range.text;
    offset = range.end;
  }
  return result + source.slice(offset);
}

/**
 * The content ranges of the outermost `<strong>`, `<em>` and `<del>` pairs, found without math so a
 * dollar never hides a tag. The server writes them where no Markdown delimiter can open and close.
 */
function emphasisContents(source: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const visit = (node: SyntaxNode): void => {
    if (literalNodes.has(node.type)) return;
    const open: { name: string; end: number }[] = [];
    for (const child of node.children ?? []) {
      const tag = child.type === 'html' ? emphasisTag.exec(child.value ?? '') : null;
      const start = child.position?.start.offset;
      const end = child.position?.end.offset;
      if (!tag || start === undefined || end === undefined) {
        if (open.length === 0) visit(child);
        continue;
      }
      const name = (tag[2] ?? '').toLowerCase();
      if (!tag[1]) {
        open.push({ name, end });
        continue;
      }
      const index = open.findLastIndex((entry) => entry.name === name);
      const opening = open[index];
      if (!opening) continue;
      open.length = index;
      if (index === 0) ranges.push({ start: opening.end, end: start });
    }
  };
  visit(fromMarkdown(source));
  return ranges;
}

type Found = { equations: Omit<Equation, 'token'>[]; escapes: number[] };

/**
 * Finds the formulas and dollar escapes of `source`, whose first character is at `offset` in the
 * document. The content of each emphasis pair is scanned on its own, so a dollar inside one never
 * pairs with a dollar outside it into a formula.
 */
function scanMath(source: string, offset: number, found: Found, insideEmphasis = false): void {
  const contents = emphasisContents(source);
  const blanked = replaceRanges(
    source,
    contents.map(({ start, end }) => ({ start, end, text: source.slice(start, end).replace(/[^\r\n]/gu, 'x') })),
  );
  const crossesContent = (start: number, end: number) =>
    contents.some((range) => start < range.end && end > range.start);
  const collect = (node: SyntaxNode, inLink = false): void => {
    if (literalNodes.has(node.type)) return;
    if (node.type === 'text') {
      found.escapes.push(...dollarEscapes(blanked, node).map((index) => index + offset));
      return;
    }
    if (!inLink && (node.type === 'math' || node.type === 'inlineMath')) {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined || node.value === undefined) failedImport();
      // A formula across an emphasis tag, or a display formula inside one, stays text.
      if (!crossesContent(start, end) && !(insideEmphasis && node.type === 'math'))
        found.equations.push({ start: start + offset, end: end + offset, kind: node.type, source: node.value });
      return;
    }
    // Inline HTML appears as sibling opening/closing tags in mdast. Leave its contents to BlockNote too.
    let htmlDepth = 0;
    for (const child of node.children ?? []) {
      if (child.type === 'html') {
        for (const tag of child.value?.matchAll(/<\s*(\/?)\s*([a-z][a-z\d-]*)\b[^>]*>/giu) ?? []) {
          if (!voidTags.has((tag[2] ?? '').toLowerCase()) && !tag[0].endsWith('/>')) {
            htmlDepth = Math.max(0, htmlDepth + (tag[1] ? -1 : 1));
          }
        }
      } else if (htmlDepth === 0) {
        collect(child, inLink || linkNodes.has(node.type));
      }
    }
  };
  collect(fromMarkdown(blanked, { extensions: [math()], mdastExtensions: [mathFromMarkdown()] }));
  for (const range of contents) scanMath(source.slice(range.start, range.end), offset + range.start, found, true);
}

function tokenPrefix(source: string): string {
  let prefix: string;
  do {
    prefix = `TINYFOLDMATH${crypto.randomUUID().replaceAll('-', '')}Q`;
  } while (source.includes(prefix));
  return prefix;
}

/**
 * The Markdown AST identifies math and dollar escapes, also inside the `<strong>`, `<em>` and `<del>`
 * the server writes; BlockNote remains responsible for every other Markdown feature.
 */
export async function importMarkdownWithMath(
  markdown: string,
  parseMarkdown: (source: string) => DocumentContent | Promise<DocumentContent>,
  /** Ids for the blocks a display formula splits off, so every block has one, as the editor's do. */
  newId: () => string = () => crypto.randomUUID(),
): Promise<DocumentContent> {
  const prefix = tokenPrefix(markdown);
  const found: Found = { equations: [], escapes: [] };
  scanMath(markdown, 0, found);
  const escapes = found.escapes;
  const equations: Equation[] = found.equations
    .toSorted((a, b) => a.start - b.start)
    .map((equation, index) => ({ ...equation, token: `${prefix}${index}END` }));

  const placeholder = (equation: Equation) => {
    if (equation.kind === 'inlineMath') return equation.token;
    const lineStart =
      Math.max(markdown.lastIndexOf('\n', equation.start - 1), markdown.lastIndexOf('\r', equation.start - 1)) + 1;
    const container = continuationPrefix(markdown.slice(lineStart, equation.start));
    // Blank lines prevent a display formula from merging with adjacent paragraphs. Keep quote/list indentation.
    return `\n${container}${equation.token}\n${container}\n${container}`;
  };
  const masked = replaceRanges(markdown, [
    ...escapes.map((offset) => ({ start: offset, end: offset + 1, text: '' })),
    ...equations.map((equation) => ({ start: equation.start, end: equation.end, text: placeholder(equation) })),
  ]);
  if (equations.length === 0) return parseMarkdown(masked);

  const parsed = await parseMarkdown(masked);
  const byToken = new Map(equations.map((equation) => [equation.token, equation]));
  const restored = new Set<string>();
  const tokens = new RegExp(`${prefix}\\d+END`, 'gu');
  const consume = (token: string): Equation => {
    const equation = byToken.get(token);
    if (!equation || restored.has(token)) failedImport();
    restored.add(token);
    return equation;
  };
  const restoreBlocks = (blocks: DocumentContent): DocumentContent =>
    blocks.flatMap((block): DocumentBlock[] => {
      const children = block.children ? restoreBlocks(block.children) : undefined;
      if (block.type === 'codeBlock' || block.type === 'mathBlock') {
        return [{ ...block, ...(children ? { children } : {}) }];
      }
      const inline =
        typeof block.content === 'string' ? [{ type: 'text', text: block.content, styles: {} }] : block.content;
      if (!Array.isArray(inline)) return [{ ...block, ...(children ? { children } : {}) }];
      const pieces: DocumentBlock[] = [];
      let content: JsonValue[] = [];
      let displayFound = false;
      let afterDisplay = false;
      const appendText = (text: string, original: { [key: string]: JsonValue }) => {
        const value = afterDisplay ? text.replace(/^[\r\n \t]+/u, '') : text;
        if (value) {
          content.push({ ...original, text: value });
          afterDisplay = false;
        }
      };
      const flushParagraph = () => {
        const last = content.at(-1);
        if (record(last) && last.type === 'text' && typeof last.text === 'string') {
          last.text = last.text.replace(/[\r\n \t]+$/u, '');
          if (!last.text) content.pop();
        }
        if (content.length) pieces.push({ id: newId(), type: 'paragraph', content });
        content = [];
      };
      for (const item of inline) {
        if (!record(item) || item.type !== 'text' || typeof item.text !== 'string') {
          content.push(item);
          continue;
        }
        let start = 0;
        for (const match of item.text.matchAll(tokens)) {
          appendText(item.text.slice(start, match.index), item);
          const equation = consume(match[0]);
          if (equation.kind === 'inlineMath') {
            content.push({ type: 'math', props: {}, content: equation.source });
            afterDisplay = false;
          } else {
            displayFound = true;
            flushParagraph();
            pieces.push({ id: newId(), type: 'mathBlock', props: {}, content: equation.source });
            afterDisplay = true;
          }
          start = match.index + match[0].length;
        }
        appendText(item.text.slice(start), item);
      }
      if (!displayFound) return [{ ...block, content, ...(children ? { children } : {}) }];
      flushParagraph();
      if (block.type === 'paragraph') {
        // The first piece keeps the block's own id; a task may point at it.
        return pieces.map((piece, index) => ({
          ...(index === 0 ? block : {}),
          ...piece,
          ...(index === 0 && block.id !== undefined ? { id: block.id } : {}),
          ...(index === 0 && children ? { children } : {}),
        }));
      }
      if (['quote', 'bulletListItem', 'numberedListItem', 'checkListItem'].includes(block.type)) {
        const first = pieces[0]?.type === 'paragraph' ? pieces.shift() : undefined;
        return [{ ...block, content: first?.content ?? [], children: [...pieces, ...(children ?? [])] }];
      }
      return failedImport();
    });
  const result = restoreBlocks(parsed);
  if (restored.size !== equations.length || JSON.stringify(result).includes(prefix)) failedImport();
  return result;
}
