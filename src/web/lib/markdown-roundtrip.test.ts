import {
  type DocumentBlock,
  type DocumentContent,
  documentToMarkdown,
  type JsonValue,
  readDocumentContent,
} from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { setupBlockNoteEditor } from './blocknote-test-editor';
import { importMarkdownWithMath } from './markdown';

const blockNote = setupBlockNoteEditor();

/** The server's Markdown for Claude Code, read back by the web import with the real BlockNote parser. */
async function roundTrip(blocks: DocumentContent) {
  const markdown = documentToMarkdown(readDocumentContent(blocks));
  const parsed = await importMarkdownWithMath(markdown, blockNote.parse);
  return { markdown, parsed: readDocumentContent(parsed) };
}

/**
 * What Markdown carries: block types and nesting, text, bold, italic, strike and code, links, LaTeX,
 * heading levels, list numbering, checklist states and code languages. Ids, colors, alignment and
 * underline have no Markdown form.
 */
type Shape = { type: string; props: Record<string, JsonValue>; content: JsonValue; children: Shape[] };
const carriedProps: Record<string, string[]> = {
  heading: ['level'],
  numberedListItem: ['start'],
  checkListItem: ['checked'],
  codeBlock: ['language'],
};
const carriedStyles = ['bold', 'italic', 'strike', 'code'];
const record = (value: JsonValue | undefined): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function shape(blocks: readonly DocumentBlock[]): Shape[] {
  return blocks.map((block) => ({
    type: block.type,
    props: Object.fromEntries(
      (carriedProps[block.type] ?? []).flatMap((key) => {
        const value = block.props?.[key];
        return value === undefined ? [] : [[key, value]];
      }),
    ),
    content: ['codeBlock', 'mathBlock'].includes(block.type) ? source(block.content) : inline(block.content),
    children: shape(block.children ?? []),
  }));
}

/** Code and display formulas compare verbatim. */
const source = (content: JsonValue | undefined): string =>
  typeof content === 'string'
    ? content
    : (Array.isArray(content) ? content : [])
        .map((item) => (record(item) && typeof item.text === 'string' ? item.text : ''))
        .join('');

/** Neighboring text with the same carried styles is one piece; BlockNote adds a space after each hard break. */
function inline(content: JsonValue | undefined): JsonValue[] {
  const items: JsonValue =
    typeof content === 'string' ? [{ type: 'text', text: content, styles: {} }] : (content ?? []);
  const result: { [key: string]: JsonValue }[] = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!record(item)) continue;
    if (item.type === 'link') result.push({ type: 'link', href: item.href ?? null, content: inline(item.content) });
    else if (item.type === 'math') result.push({ type: 'math', content: item.content ?? null });
    else if (typeof item.text === 'string') {
      const styles = record(item.styles) ? item.styles : {};
      const kept = carriedStyles.filter((style) => styles[style] === true).join(' ');
      const text = item.text.replaceAll('\n ', '\n');
      const previous = result.at(-1);
      if (previous?.type === 'text' && previous.styles === kept) previous.text = `${previous.text}${text}`;
      else result.push({ type: 'text', text, styles: kept });
    }
  }
  return result;
}

const text = (value: string, styles: Record<string, boolean> = {}) => ({ type: 'text', text: value, styles });
const formula = (latex: string) => ({ type: 'math', props: {}, content: latex });
const link = (href: string, ...content: JsonValue[]) => ({ type: 'link', href, content });
const paragraph = (...content: JsonValue[]): DocumentBlock => ({ type: 'paragraph', content });

describe('server Markdown read back by the BlockNote parser', () => {
  it('keeps every accepted block, style, link, formula and checklist state', async () => {
    // Parser quirks the fixture avoids: whitespace or a line break at the edge of styled text moves
    // across the edge, and a bare address in text becomes a link.
    const blocks: DocumentContent = [
      { type: 'heading', props: { level: 1 }, content: [text('Plano # do MCP')] },
      { type: 'heading', props: { level: 3 }, content: [text('Detalhes '), text('em negrito', { bold: true })] },
      paragraph(
        text('Texto '),
        text('negrito', { bold: true }),
        text(', '),
        text('itálico', { italic: true }),
        text(', '),
        text('riscado', { strike: true }),
        text(', '),
        text('código `com` crase', { code: true }),
        text(' e '),
        text('tudo', { bold: true, italic: true }),
        text('; re'),
        text('escre', { italic: true }),
        text('ver.'),
      ),
      paragraph(text('Escapes: \\ * _ [ ] ` ~ a < b & c | { } ( ) ! . + e R$ 10 ou R$ 20 e US$')),
      paragraph(text('# não é título')),
      paragraph(text('- não é lista')),
      paragraph(text('2026. não é lista numerada')),
      paragraph(text('> não é citação')),
      paragraph(text('primeira linha\n# segunda linha\n- terceira')),
      paragraph(
        link('https://example.com/a(b) c', text('link '), text('forte', { bold: true })),
        text(' e '),
        link('https://tinyfold.dev/x', text('outro')),
      ),
      paragraph(
        text('Energia '),
        formula('E = mc^2'),
        text(', vizinhas '),
        formula('x'),
        formula('y'),
        text(', com cifrão '),
        formula('\\text{R\\$ 5}'),
        text(' e R$ 1'),
      ),
      {
        type: 'bulletListItem',
        content: [text('item')],
        children: [
          { type: 'bulletListItem', content: [text('filho')] },
          { type: 'numberedListItem', content: [text('filho numerado')] },
        ],
      },
      { type: 'bulletListItem', content: [text('outro item')] },
      { type: 'checkListItem', props: { checked: false }, content: [text('a fazer')] },
      {
        type: 'checkListItem',
        props: { checked: true },
        content: [text('feito')],
        children: [{ type: 'checkListItem', props: { checked: false }, content: [text('subtarefa')] }],
      },
      { type: 'numberedListItem', props: { start: 3 }, content: [text('três')] },
      { type: 'numberedListItem', content: [text('quatro')] },
      { type: 'numberedListItem', props: { start: 10 }, content: [text('dez')] },
      { type: 'quote', content: [text('citação '), text('forte', { bold: true }), text(' e\nsegunda linha')] },
      { type: 'codeBlock', props: { language: 'typescript' }, content: 'const a = `x`;\n```\nconst b = "$y$";' },
      { type: 'mathBlock', props: {}, content: '\\frac{a}{b}\n$x$' },
      paragraph(text('fim')),
    ];
    const { markdown, parsed } = await roundTrip(blocks);
    expect(shape(parsed), markdown).toEqual(shape(blocks));
  });

  it('places blocks nested under a paragraph, heading, quote or code after it, as Markdown requires', async () => {
    const child = paragraph(text('filho'));
    const { parsed } = await roundTrip([
      { ...paragraph(text('parágrafo')), children: [child] },
      { type: 'heading', props: { level: 2 }, content: [text('título')], children: [child] },
      { type: 'quote', content: [text('citação')], children: [child] },
      { type: 'codeBlock', props: { language: 'text' }, content: 'código', children: [child] },
    ]);
    expect(shape(parsed).map(({ type, children }) => [type, children.length])).toEqual([
      ['paragraph', 0],
      ['paragraph', 0],
      ['heading', 0],
      ['paragraph', 0],
      ['quote', 0],
      ['paragraph', 0],
      ['codeBlock', 0],
      ['paragraph', 0],
    ]);
  });
});
