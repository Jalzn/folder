import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JsonValue } from '#core/domain';
import { type DocumentBlock, type DocumentContent, documentPlainText, documentToMarkdown } from '#rich-text/domain';
import { setupBlockNoteEditor } from '../../testing/blocknote-editor';
import { importMarkdownWithMath } from './markdown';

const blockNote = setupBlockNoteEditor();
const parse = blockNote.parse;
afterEach(() => vi.restoreAllMocks());

async function imported(markdown: string) {
  return blockNote.reload(await importMarkdownWithMath(markdown, parse));
}

describe('Markdown export preserves raw equations', () => {
  /** The `.md` a document exports, by the domain's serializer, read back by the import. */
  async function roundTrip(blocks: DocumentContent) {
    const markdown = documentToMarkdown(blocks as DocumentBlock[]);
    const restored = await imported(markdown);
    return { markdown, restored };
  }

  it('preserves invalid inline and display sources without passing them to KaTeX', async () => {
    const blocks: DocumentContent = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Before ', styles: {} },
          { type: 'math', props: {}, content: '\\frac{' },
        ],
      },
      { type: 'mathBlock', props: {}, content: '\\sqrt{' },
    ];
    const { markdown, restored } = await roundTrip(blocks);
    expect(markdown).toContain('$\\frac{$');
    expect(markdown).toContain('$$\n\\sqrt{\n$$');
    expect(formulas(restored, 'math')).toEqual(['\\frac{']);
    expect(formulas(restored, 'mathBlock')).toEqual(['\\sqrt{']);
  });

  it.each([String.raw`\text{cost \$5}`, String.raw`\text{a $ b $$ c $$$ d}`, '$x$', '  x  ', ' x', 'x ', '   ', '\t'])(
    'chooses unambiguous inline fences and preserves source: %s',
    async (source) => {
      const { restored } = await roundTrip([
        { type: 'paragraph', content: [{ type: 'math', props: {}, content: source }] },
      ]);
      expect(formulas(restored, 'math')).toEqual([source]);
    },
  );

  it('exports adjacent inline formulas as separate nodes without adding visible text', async () => {
    const { markdown, restored } = await roundTrip([
      {
        type: 'paragraph',
        content: [
          { type: 'math', props: {}, content: 'x' },
          { type: 'math', props: {}, content: 'y' },
        ],
      },
    ]);
    expect(markdown).toContain('$x$<!-- -->$y$');
    expect(formulas(restored, 'math')).toEqual(['x', 'y']);
    expect(documentPlainText(restored)).toBe('xy');
  });

  it('retains a display source containing dollar fences, leading spaces and blank lines', async () => {
    const source = '\n  x\n$$\ny $$$ z  \n';
    const { restored } = await roundTrip([{ type: 'mathBlock', props: {}, content: source }]);
    expect(formulas(restored, 'mathBlock')).toEqual([source]);
  });

  it('retains sources and styles inside list and quote containers', async () => {
    const blocks: DocumentContent = [
      {
        id: 'parent',
        type: 'bulletListItem',
        content: [
          { type: 'text', text: 'Topic ', styles: { bold: true } },
          { type: 'math', props: {}, content: 'x' },
        ],
        children: [{ id: 'formula', type: 'mathBlock', props: {}, content: 'a\nb' }],
      },
      {
        id: 'quote',
        type: 'quote',
        content: 'Quote',
        children: [{ type: 'mathBlock', props: {}, content: '\\frac{' }],
      },
    ];
    const before = JSON.stringify(blocks);
    const { restored } = await roundTrip(blocks);
    expect(JSON.stringify(blocks)).toBe(before);
    expect(formulas(restored, 'math')).toEqual(['x']);
    expect(formulas(restored, 'mathBlock')).toEqual(['a\nb', '\\frac{']);
    expect((restored[0]?.content as JsonValue[] | undefined)?.[0]).toEqual({
      type: 'text',
      text: 'Topic',
      styles: { bold: true },
    });
    expect(documentPlainText(restored)).toContain('Topic x');
  });

  it('uses standard Markdown whitespace semantics for empty and multiline inline formulas', async () => {
    const { restored } = await roundTrip([
      {
        type: 'paragraph',
        content: [
          { type: 'math', props: {}, content: '' },
          { type: 'math', props: {}, content: 'a\nb' },
        ],
      },
    ]);
    expect(formulas(restored, 'math')).toEqual([' ', 'a b']);
  });

  it('does not change code containing dollar signs', async () => {
    const { restored } = await roundTrip([
      { type: 'codeBlock', props: { language: 'text' }, content: '$code$\n$$code$$' },
      { type: 'paragraph', content: [{ type: 'math', props: {}, content: 'x' }] },
    ]);
    expect(documentPlainText([restored[0] as NonNullable<(typeof restored)[0]>])).toBe('$code$\n$$code$$');
    expect(formulas(restored, 'math')).toEqual(['x']);
  });
});
function formulas(value: unknown, type: 'mathBlock' | 'math'): string[] {
  if (Array.isArray(value)) return value.flatMap((entry) => formulas(entry, type));
  if (value === null || typeof value !== 'object') return [];
  const node = value as { type?: string; content?: unknown; children?: unknown };
  const own =
    node.type === type
      ? [
          typeof node.content === 'string'
            ? node.content
            : documentPlainText([{ type: 'paragraph', content: node.content as JsonValue }]),
        ]
      : [];
  return [...own, ...formulas(node.content, type), ...formulas(node.children, type)];
}

describe('Markdown equations with the real BlockNote parser', () => {
  it('preserves inline formulas and the styles of neighboring text', async () => {
    const blocks = await imported('**Before $x^2$ after** and *$y$ italic*.');
    expect(formulas(blocks, 'math')).toEqual(['x^2', 'y']);
    expect(blocks[0]?.content).toEqual([
      { type: 'text', text: 'Before ', styles: { bold: true } },
      { type: 'math', props: {}, content: 'x^2' },
      { type: 'text', text: ' after', styles: { bold: true } },
      { type: 'text', text: ' and ', styles: {} },
      { type: 'math', props: {}, content: 'y' },
      { type: 'text', text: ' italic', styles: { italic: true } },
      { type: 'text', text: '.', styles: {} },
    ]);
  });

  it('keeps display formulas separate even without blank lines', async () => {
    const blocks = await imported('Before\n$$\n\\frac{a}{b}\n$$\nAfter');
    expect(blocks.map((block) => block.type)).toEqual(['paragraph', 'mathBlock', 'paragraph']);
    expect(formulas(blocks, 'mathBlock')).toEqual(['\\frac{a}{b}']);
    expect(documentPlainText(blocks)).toBe('Before\n\\frac{a}{b}\nAfter');
  });

  it('preserves empty and invalid LaTeX sources without interpreting them', async () => {
    const blocks = await imported('$$\n\n$$\n\n$$\n\\frac{\n$$\n\nIncomplete $\\sqrt{$.');
    expect(formulas(blocks, 'mathBlock')).toEqual(['', '\\frac{']);
    expect(formulas(blocks, 'math')).toEqual(['\\sqrt{']);
  });

  it('keeps formulas and following paragraphs inside nested lists', async () => {
    const blocks = await imported('- Parent\n  - Child $x$\n\n    $$\n    y\n    $$\n\n    After');
    const child = blocks[0]?.children?.[0];
    expect(blocks[0]?.type).toBe('bulletListItem');
    expect(child?.type).toBe('bulletListItem');
    expect(formulas(child?.content, 'math')).toEqual(['x']);
    expect(child?.children?.map((block) => block.type)).toEqual(['mathBlock', 'paragraph']);
    expect(documentPlainText(child?.children ?? [])).toBe('y\nAfter');
  });

  it('preserves quote content surrounding a display formula', async () => {
    const blocks = await imported('> Before $x$\n>\n> $$\n> y\n> $$\n>\n> After $z$');
    expect(blocks[0]?.type).toBe('quote');
    expect(formulas(blocks[0]?.content, 'math')).toEqual(['x']);
    expect(blocks[0]?.children?.map((block) => block.type)).toEqual(['mathBlock', 'paragraph']);
    expect(formulas(blocks[0]?.children, 'math')).toEqual(['z']);
  });

  it.each(['- ', '1. ', '> '])('preserves the container when a formula is its first content: %s', async (prefix) => {
    const continuation = prefix === '> ' ? '> ' : ' '.repeat(prefix.length);
    const blocks = await imported(`${prefix}$$\n${continuation}x\n${continuation}$$`);
    expect(blocks[0]?.type).toBe(prefix === '> ' ? 'quote' : prefix === '- ' ? 'bulletListItem' : 'numberedListItem');
    expect(blocks[0]?.children?.[0]?.type).toBe('mathBlock');
    expect(formulas(blocks, 'mathBlock')).toEqual(['x']);
  });

  it('leaves fenced code, inline code, escaped dollars and link labels untouched', async () => {
    const markdown = String.raw`Escaped \$not_math\$, code \`$not_math$\`, [$link$](https://example.com) and $yes$.

~~~text
$$
not_math
$$
~~~
`.replaceAll('\\`', '`');
    const blocks = await imported(markdown);
    expect(formulas(blocks, 'math')).toEqual(['yes']);
    expect(formulas(blocks, 'mathBlock')).toEqual([]);
    expect(blocks.find((block) => block.type === 'codeBlock')).toBeDefined();
    expect(documentPlainText(blocks)).toContain('$$\nnot_math\n$$');
    expect(documentPlainText(blocks)).toContain('$link$');
  });

  it('does not mask HTML contents or reference link labels', async () => {
    const markdown = '<span>$html$</span> outside $yes$ and [$ref$][target].\n\n[target]: https://example.com';
    let masked = '';
    const blocks = await importMarkdownWithMath(markdown, (source) => {
      masked = source;
      return parse(source);
    });
    expect(masked).toContain('<span>$html$</span>');
    expect(masked).toContain('[$ref$][target]');
    expect(formulas(blocks, 'math')).toEqual(['yes']);
  });

  it('hands Markdown without formulas to BlockNote unchanged except for dollar escapes', async () => {
    const markdown = '# Heading\n\n`$literal$`\n\n\\$escaped\\$ and an unmatched $ sign.';
    const callback = vi.fn(async () => [{ id: 'existing', type: 'paragraph', content: 'parsed' }]);
    const result = await importMarkdownWithMath(markdown, callback);
    expect(callback).toHaveBeenCalledExactlyOnceWith('# Heading\n\n`$literal$`\n\n$escaped$ and an unmatched $ sign.');
    expect(result).toBe(await callback.mock.results[0]?.value);
  });

  it('reads escaped dollars as dollars in text, emphasis and links, but not in code', async () => {
    const blocks = await imported(
      'Custa R\\$ 10, **R\\$ 20** e [R\\$ 30](https://example.com), código `R\\$` e barra a\\\\$b.\n\n```\nR\\$ 40\n```',
    );
    expect(documentPlainText(blocks)).toBe('Custa R$ 10, R$ 20 e R$ 30, código R\\$ e barra a\\$b.\nR\\$ 40');
    expect(blocks[0]?.content).toContainEqual({ type: 'text', text: 'R$ 20', styles: { bold: true } });
  });

  it('reads dollars and formulas inside <strong>, <em> and <del> on their own', async () => {
    const [first] = await imported('<strong>Preço: R$ 10!</strong>Agora e R\\$ 5 e $y$');
    expect(first?.content).toEqual([
      { type: 'text', text: 'Preço: R$ 10!', styles: { bold: true } },
      { type: 'text', text: 'Agora e R$ 5 e ', styles: {} },
      { type: 'math', props: {}, content: 'y' },
    ]);
    const [second] = await imported('<em>a $x$ b</em> e <del>R\\$ 2</del> <strong><em>R\\$ 3</em></strong>');
    expect(second?.content).toEqual([
      { type: 'text', text: 'a ', styles: { italic: true } },
      { type: 'math', props: {}, content: 'x' },
      { type: 'text', text: ' b', styles: { italic: true } },
      { type: 'text', text: ' e ', styles: {} },
      { type: 'text', text: 'R$ 2', styles: { strike: true } },
      { type: 'text', text: ' ', styles: {} },
      { type: 'text', text: 'R$ 3', styles: { bold: true, italic: true } },
    ]);
  });

  it('keeps a formula across an emphasis tag, and other inline HTML, as BlockNote reads them', async () => {
    const blocks = await imported('$a <strong>b</strong> c$ e <span>R\\$ 4</span>');
    expect(formulas(blocks, 'math')).toEqual([]);
    expect(documentPlainText(blocks)).toBe('$a b c$ e R\\$ 4');
  });

  it('resolves an escaped dollar next to a formula', async () => {
    const blocks = await imported('Preço \\$$x$ e $y$\\$.');
    expect(formulas(blocks, 'math')).toEqual(['x', 'y']);
    expect(documentPlainText(blocks)).toBe('Preço $x e y$.');
  });

  it('understands repeated dollar delimiters, adjacent formulas and CRLF', async () => {
    const blocks = await imported('A $x$ $y$ and $$a $ b$$.\r\n\r\n$$$\r\nc $$ d\r\n$$$');
    expect(formulas(blocks, 'math')).toEqual(['x', 'y', 'a $ b']);
    expect(formulas(blocks, 'mathBlock')).toEqual(['c $$ d']);
  });

  it('preserves long formulas and many distinct placeholders', async () => {
    const source = `${Array.from({ length: 120 }, (_, index) => `$x_{${index}}$`).join(' ')} $${'a'.repeat(20_000)}$`;
    const blocks = await imported(source);
    expect(formulas(blocks, 'math')).toHaveLength(121);
    expect(formulas(blocks, 'math').at(-1)).toHaveLength(20_000);
    expect(JSON.stringify(blocks)).not.toContain('TINYFOLDMATH');
  });

  it('gives an id to every block a display formula splits off, nested ones included', async () => {
    let next = 0;
    const blocks = await importMarkdownWithMath(
      '> Antes\n>\n> $$\n> x^2\n> $$\n>\n> depois\n\nParágrafo seguinte',
      parse,
      () => `new-${next++}`,
    );
    const ids: (string | undefined)[] = [];
    const visit = (list: DocumentContent) => {
      for (const block of list) {
        ids.push(block.id);
        if (block.children) visit(block.children);
      }
    };
    visit(blocks);
    expect(formulas(blocks, 'mathBlock')).toEqual(['x^2']);
    expect(next).toBeGreaterThan(0);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('retains parser-generated ids, children and neighboring content without mutating the parser result', async () => {
    let original: DocumentContent = [];
    let originalJson = '';
    const result = await importMarkdownWithMath('- item $x$\n  - child', (source) => {
      original = parse(source);
      originalJson = JSON.stringify(original);
      return original;
    });
    expect(JSON.stringify(original)).toBe(originalJson);
    expect(result[0]?.id).toBe(original[0]?.id);
    expect(result[0]?.children?.[0]?.id).toBe(original[0]?.children?.[0]?.id);
    expect(documentPlainText(result)).toBe('item x\nchild');
  });

  it.each(['drop', 'duplicate', 'link'] as const)(
    'fails safely when the parser would %s a placeholder',
    async (fault) => {
      await expect(
        importMarkdownWithMath('$x$', (source) => {
          if (fault === 'drop') return [];
          if (fault === 'duplicate') return [{ type: 'paragraph', content: `${source} ${source}` }];
          return [{ type: 'paragraph', content: [{ type: 'link', href: 'https://example.com', content: source }] }];
        }),
      ).rejects.toThrow('Não foi possível preservar todas as equações');
    },
  );

  it('regenerates a placeholder namespace that collides with user text', async () => {
    const first = '11111111-1111-4111-8111-111111111111';
    const second = '22222222-2222-4222-8222-222222222222';
    const prefix = `TINYFOLDMATH${first.replaceAll('-', '')}Q`;
    const random = vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(first).mockReturnValueOnce(second);
    const blocks = await importMarkdownWithMath(`${prefix} stays and $x$`, parse);
    expect(random).toHaveBeenCalledTimes(2);
    expect(documentPlainText(blocks)).toBe(`${prefix} stays and x`);
  });
});
