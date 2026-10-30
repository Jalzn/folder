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

const excludedNodes = new Set(['link', 'linkReference', 'image', 'imageReference', 'code', 'inlineCode', 'html']);
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

function tokenPrefix(source: string): string {
  let prefix: string;
  do {
    prefix = `TINYFOLDMATH${crypto.randomUUID().replaceAll('-', '')}Q`;
  } while (source.includes(prefix));
  return prefix;
}

/** The Markdown AST identifies math; BlockNote remains responsible for every other Markdown feature. */
export async function importMarkdownWithMath(
  markdown: string,
  parseMarkdown: (source: string) => DocumentContent | Promise<DocumentContent>,
): Promise<DocumentContent> {
  const prefix = tokenPrefix(markdown);
  const equations: Equation[] = [];
  const collect = (node: SyntaxNode): void => {
    if (excludedNodes.has(node.type)) return;
    if (node.type === 'math' || node.type === 'inlineMath') {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined || node.value === undefined) failedImport();
      equations.push({ start, end, kind: node.type, source: node.value, token: `${prefix}${equations.length}END` });
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
        collect(child);
      }
    }
  };
  collect(fromMarkdown(markdown, { extensions: [math()], mdastExtensions: [mathFromMarkdown()] }));
  if (equations.length === 0) return parseMarkdown(markdown);

  let masked = '';
  let offset = 0;
  for (const equation of equations) {
    masked += markdown.slice(offset, equation.start);
    if (equation.kind === 'math') {
      const lineStart =
        Math.max(markdown.lastIndexOf('\n', equation.start - 1), markdown.lastIndexOf('\r', equation.start - 1)) + 1;
      const container = continuationPrefix(markdown.slice(lineStart, equation.start));
      // Blank lines prevent a display formula from merging with adjacent paragraphs. Keep quote/list indentation.
      masked += `\n${container}${equation.token}\n${container}\n${container}`;
    } else {
      masked += equation.token;
    }
    offset = equation.end;
  }
  masked += markdown.slice(offset);

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
        if (content.length) pieces.push({ type: 'paragraph', content });
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
            pieces.push({ type: 'mathBlock', props: {}, content: equation.source });
            afterDisplay = true;
          }
          start = match.index + match[0].length;
        }
        appendText(item.text.slice(start), item);
      }
      if (!displayFound) return [{ ...block, content, ...(children ? { children } : {}) }];
      flushParagraph();
      if (block.type === 'paragraph') {
        return pieces.map((piece, index) => ({
          ...(index === 0 ? block : {}),
          ...piece,
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

function failedExport(): never {
  throw new Error('Não foi possível preservar todas as equações na exportação. Seu documento continua salvo.');
}

function plainSource(content: JsonValue | undefined): string {
  if (content === undefined) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return failedExport();
  return content
    .map((item) => {
      if (!record(item) || item.type !== 'text' || typeof item.text !== 'string') return failedExport();
      return item.text;
    })
    .join('');
}

/** Export raw LaTeX directly: KaTeX's external HTML omits formulas whose syntax is incomplete. */
export async function exportMarkdownWithMath(
  blocks: DocumentContent,
  exportMarkdown: (content: DocumentContent) => string | Promise<string>,
): Promise<string> {
  const prefix = tokenPrefix(JSON.stringify(blocks));
  const equations = new Map<string, { kind: 'block' | 'inline'; source: string }>();
  const mask = (kind: 'block' | 'inline', source: string): JsonValue => {
    const token = `${prefix}${equations.size}END`;
    equations.set(token, { kind, source });
    return { type: 'text', text: token, styles: {} };
  };
  const maskInline = (content: JsonValue | undefined): JsonValue | undefined => {
    if (!Array.isArray(content)) return content;
    return content.map((item) => {
      if (!record(item) || item.type !== 'math') return item;
      if (typeof item.content !== 'string') return failedExport();
      return mask('inline', item.content);
    });
  };
  const maskBlocks = (content: DocumentContent): DocumentContent =>
    content.map((block) => {
      const children = block.children ? maskBlocks(block.children) : undefined;
      if (block.type === 'mathBlock') {
        return {
          ...block,
          type: 'paragraph',
          props: {},
          content: [mask('block', plainSource(block.content))],
          ...(children ? { children } : {}),
        };
      }
      const inline = maskInline(block.content);
      return { ...block, ...(inline !== undefined ? { content: inline } : {}), ...(children ? { children } : {}) };
    });
  const masked = maskBlocks(blocks);
  const markdown = await exportMarkdown(masked);
  if (equations.size === 0) return markdown;
  const restored = new Set<string>();
  const tokens = new RegExp(`${prefix}\\d+END`, 'gu');
  let result = '';
  let offset = 0;
  let previousInline = false;
  for (const match of markdown.matchAll(tokens)) {
    const equation = equations.get(match[0]);
    if (!equation || restored.has(match[0])) return failedExport();
    restored.add(match[0]);
    result += markdown.slice(offset, match.index);
    const source = equation.source.replace(/\r\n?/gu, '\n');
    let longestRun = 0;
    for (const run of source.matchAll(/\$+/gu)) longestRun = Math.max(longestRun, run[0].length);
    const fence = '$'.repeat(Math.max(equation.kind === 'block' ? 2 : 1, longestRun + 1));
    if (equation.kind === 'block') {
      const lineStart = markdown.lastIndexOf('\n', match.index - 1) + 1;
      const container = continuationPrefix(markdown.slice(lineStart, match.index));
      if (!/^[\s>]*$/u.test(container)) return failedExport();
      result += `${fence}\n${container}${source.replaceAll('\n', `\n${container}`)}\n${container}${fence}`;
    } else {
      // Markdown normalizes inline line endings to spaces; display equations retain multiline sources.
      let inline = source.replaceAll('\n', ' ');
      if (!inline) inline = ' ';
      if (/^\$|\$$/u.test(inline) || (/[^ ]/u.test(inline) && inline.startsWith(' ') && inline.endsWith(' '))) {
        inline = ` ${inline} `;
      }
      // A comment separates adjacent dollar fences without adding visible spaces to the document.
      if ((previousInline && offset === match.index) || markdown[match.index - 1] === '$') result += '<!-- -->';
      result += `${fence}${inline}${fence}`;
      if (markdown[match.index + match[0].length] === '$') result += '<!-- -->';
    }
    previousInline = equation.kind === 'inline';
    offset = match.index + match[0].length;
  }
  result += markdown.slice(offset);
  if (restored.size !== equations.size || result.includes(prefix)) return failedExport();
  return result;
}
