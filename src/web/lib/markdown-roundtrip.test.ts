import {
  type DocumentBlock,
  type DocumentContent,
  documentToMarkdown,
  type JsonValue,
  readDocumentContent,
} from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { setupBlockNoteEditor } from '../testing/blocknote-editor';
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

/** Neighboring text with the same carried styles is one piece, however the parser splits it. */
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
      const previous = result.at(-1);
      if (previous?.type === 'text' && previous.styles === kept) previous.text = `${previous.text}${item.text}`;
      else result.push({ type: 'text', text: item.text, styles: kept });
    }
  }
  return result;
}

const text = (value: string, styles: Record<string, boolean> = {}) => ({ type: 'text', text: value, styles });
const formula = (latex: string) => ({ type: 'math', props: {}, content: latex });
const link = (href: string, ...content: JsonValue[]) => ({ type: 'link', href, content });
const paragraph = (...content: JsonValue[]): DocumentBlock => ({ type: 'paragraph', content });
const item = (type: string, content: string, extra: Partial<DocumentBlock> = {}): DocumentBlock => ({
  type,
  content: [text(content)],
  ...extra,
});
/** The blocks the parser returns, as Markdown can carry them. */
const readBack = async (blocks: DocumentContent) => shape((await roundTrip(blocks)).parsed);

describe('server Markdown read back by the BlockNote parser', () => {
  it('keeps every accepted block, style, link, formula and checklist state', async () => {
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
      // No delimiter can close after "!" and before a letter, so these spans are written as HTML pairs.
      paragraph(
        text('Atenção!', { bold: true }),
        text('Leia isto e palavra'),
        text('(negrito)', { bold: true }),
        text('fim e '),
        text('x', { italic: true }),
        text('2 e '),
        text('riscado!', { strike: true }),
        text('sim'),
      ),
      // An escaped `_` right before an opening `_` reads as text, so this italic is written with `*`.
      paragraph(text('var_'), text('x', { italic: true }), text(' fim')),
      paragraph(text('Escapes: \\ * _ [ ] ` ~ a < b & c | { } ( ) ! . + a = b e R$ 10 ou R$ 20 e US$')),
      paragraph(text('# não é título')),
      paragraph(text('- não é lista')),
      paragraph(text('2026. não é lista numerada')),
      paragraph(text('> não é citação')),
      paragraph(text('===')),
      paragraph(text(':--|:--')),
      paragraph(text('Veja!'), link('https://example.com', text('isto'))),
      paragraph(
        link('https://example.com/a(b) c', text('link '), text('forte', { bold: true })),
        text(' e '),
        link('https://tinyfold.dev/x?a=1&b=(2)', text('outro')),
        text(' e '),
        link('mailto:eu@exemplo.com', text('e-mail')),
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
      item('bulletListItem', 'item\nem duas linhas\n# sem título', {
        children: [
          item('bulletListItem', 'filho'),
          item('numberedListItem', 'filho numerado\ncom quebra'),
          item('checkListItem', 'filho a fazer', { props: { checked: false } }),
        ],
      }),
      item('bulletListItem', 'outro item'),
      item('checkListItem', 'a fazer', { props: { checked: false } }),
      item('checkListItem', 'feito\ncom detalhe', {
        props: { checked: true },
        children: [item('checkListItem', 'subtarefa', { props: { checked: false } })],
      }),
      item('numberedListItem', 'três', { props: { start: 3 } }),
      item('numberedListItem', 'quatro\ncontinua'),
      item('numberedListItem', 'dez', { props: { start: 10 } }),
      item('numberedListItem', 'do zero', { props: { start: 0 } }),
      { type: 'quote', content: [text('citação '), text('forte', { bold: true }), text(' e fim')] },
      { type: 'codeBlock', props: { language: 'typescript' }, content: 'const a = `x`;\n```\nconst b = "$y$";' },
      { type: 'mathBlock', props: {}, content: '\\frac{a}{b}\n$x$' },
      paragraph(text('fim')),
    ];
    const { markdown, parsed } = await roundTrip(blocks);
    expect(shape(parsed), markdown).toEqual(shape(blocks));
  });

  it('writes what Markdown cannot hold in the nearest form it can', async () => {
    const child = paragraph(text('filho'));
    expect(
      await readBack([
        { ...paragraph(text('parágrafo')), children: [child] },
        { type: 'heading', props: { level: 2 }, content: [text('título')], children: [child] },
        { type: 'quote', content: [text('citação')], children: [child] },
        { type: 'codeBlock', props: { language: 'text' }, content: 'código', children: [child] },
      ]),
    ).toEqual(
      shape([
        paragraph(text('parágrafo')),
        child,
        { type: 'heading', props: { level: 2 }, content: [text('título')] },
        child,
        { type: 'quote', content: [text('citação')] },
        child,
        { type: 'codeBlock', props: { language: 'text' }, content: 'código' },
        child,
      ]),
    );
    // Leading indentation would make an indented code block, and list starts are kept within 0..999,999,999.
    expect(
      await readBack([
        paragraph(text('    quatro espaços')),
        paragraph(text('\tcom tab')),
        item('numberedListItem', 'menos um', { props: { start: -1 } }),
        paragraph(text('entre')),
        item('numberedListItem', 'grande', { props: { start: 12_345_678_901 } }),
      ]),
    ).toEqual(
      shape([
        paragraph(text('quatro espaços')),
        paragraph(text('com tab')),
        item('numberedListItem', 'menos um', { props: { start: 0 } }),
        paragraph(text('entre')),
        item('numberedListItem', 'grande', { props: { start: 999_999_999 } }),
      ]),
    );
    // Emphasis cannot start or end on whitespace, so the spaces are written outside it.
    expect(await readBack([paragraph(text('a'), text(' forte ', { bold: true }), text('b'))])).toEqual(
      shape([paragraph(text('a '), text('forte', { bold: true }), text(' b'))]),
    );
  });

  /**
   * The server Markdown is what a CommonMark reader such as Claude expects. These differences come
   * from the BlockNote 0.56 parser behind the web import, and no Markdown form avoids them.
   */
  describe('known losses of the BlockNote parser', () => {
    it('adds a space after a hard break in a paragraph or quote, and keeps escaped markers as text', async () => {
      expect(
        await readBack([
          paragraph(text('primeira linha\n# segunda linha\n- terceira')),
          paragraph(text('a | b\n:--|:--')),
          { type: 'quote', content: [text('citação\nsegunda')] },
        ]),
      ).toEqual(
        shape([
          paragraph(text('primeira linha\n # segunda linha\n - terceira')),
          paragraph(text('a | b\n :--|:--')),
          { type: 'quote', content: [text('citação\n segunda')] },
        ]),
      );
    });

    it('moves a line break at the edge of styled text into the style', async () => {
      expect(await readBack([paragraph(text('negrito', { bold: true }), text('\ndepois'))])).toEqual(
        shape([paragraph(text('negrito\n', { bold: true }), text(' depois'))]),
      );
    });

    it('keeps the backslash of an escaped = line after a hard break', async () => {
      expect(await readBack([paragraph(text('título\n==='))])).toEqual(shape([paragraph(text('título\n \\==='))]));
    });

    it('keeps escapes in link addresses with unbalanced parentheses, angle brackets or backslashes', async () => {
      const addresses = (hrefs: string[]) =>
        paragraph(
          link(hrefs[0] as string, text('um')),
          text(' '),
          link(hrefs[1] as string, text('dois')),
          text(' '),
          link(hrefs[2] as string, text('três')),
        );
      expect(
        await readBack([addresses(['https://ex.com/a)b', 'https://ex.com/a b<c>', 'https://ex.com/a\\b'])]),
      ).toEqual(shape([addresses(['https://ex.com/a\\)b', 'https://ex.com/a b\\<c\\', 'https://ex.com/a\\\\b'])]));
    });

    it('reads text shaped like an HTML tag as HTML', async () => {
      expect(await readBack([paragraph(text('use <div> aqui e a<b'))])).toEqual(
        shape([paragraph(text('use ')), paragraph(text(' aqui e a<b'))]),
      );
    });

    it('turns a bare address in text into a link', async () => {
      expect(await readBack([paragraph(text('veja https://tinyfold.dev agora'))])).toEqual(
        shape([paragraph(text('veja '), link('https://tinyfold.dev', text('https://tinyfold.dev')), text(' agora'))]),
      );
    });

    it('returns the paragraph children of a task item as siblings', async () => {
      expect(
        await readBack([
          item('checkListItem', 'tarefa', { props: { checked: false }, children: [paragraph(text('detalhe'))] }),
        ]),
      ).toEqual(shape([item('checkListItem', 'tarefa', { props: { checked: false } }), paragraph(text('detalhe'))]));
    });

    it('returns a list that follows a paragraph or code child of an item as the next sibling', async () => {
      const code: DocumentBlock = { type: 'codeBlock', props: { language: 'text' }, content: 'x = 1' };
      expect(
        await readBack([
          item('bulletListItem', 'com parágrafo', {
            children: [paragraph(text('parágrafo')), item('bulletListItem', 'depois do parágrafo')],
          }),
          item('bulletListItem', 'com código', { children: [code, item('bulletListItem', 'depois do código')] }),
        ]),
      ).toEqual(
        shape([
          item('bulletListItem', 'com parágrafo', { children: [paragraph(text('parágrafo'))] }),
          item('bulletListItem', 'depois do parágrafo'),
          item('bulletListItem', 'com código', { children: [code] }),
          item('bulletListItem', 'depois do código'),
        ]),
      );
    });

    it('returns a paragraph or code child that follows a nested list as an item of the outer list', async () => {
      const code: DocumentBlock = { type: 'codeBlock', props: { language: 'sh' }, content: 'ls' };
      expect(
        await readBack([
          item('bulletListItem', 'com parágrafo', {
            children: [item('bulletListItem', 'filho'), paragraph(text('parágrafo depois'))],
          }),
          item('bulletListItem', 'com código', {
            children: [item('checkListItem', 'filho', { props: { checked: false } }), code],
          }),
          item('numberedListItem', 'numerado', {
            children: [item('numberedListItem', 'filho'), paragraph(text('parágrafo depois'))],
          }),
        ]),
      ).toEqual(
        shape([
          item('bulletListItem', 'com parágrafo', { children: [item('bulletListItem', 'filho')] }),
          item('bulletListItem', 'parágrafo depois'),
          item('bulletListItem', 'com código', {
            children: [item('checkListItem', 'filho', { props: { checked: false } })],
          }),
          // The code becomes the item's text, and its language is lost.
          item('bulletListItem', 'ls'),
          item('numberedListItem', 'numerado', { children: [item('numberedListItem', 'filho')] }),
          item('numberedListItem', 'parágrafo depois'),
        ]),
      );
    });
  });
});
