import { describe, expect, it } from 'vitest';
import { documentToMarkdown } from './markdown.js';
import type { DocumentBlock, JsonValue } from './models.js';

const text = (value: string, styles: Record<string, boolean> = {}) => ({ type: 'text', text: value, styles });
const block = (type: string, content: JsonValue[] | string, extra: Partial<DocumentBlock> = {}): DocumentBlock => ({
  type,
  content,
  ...extra,
});
const paragraph = (...content: JsonValue[]) => block('paragraph', content);
const markdown = (...blocks: DocumentBlock[]) => documentToMarkdown(blocks);

describe('document to Markdown', () => {
  it('returns an empty string for an empty document and skips empty blocks', () => {
    expect(markdown()).toBe('');
    expect(markdown(paragraph(), paragraph(text('   ')), block('heading', []))).toBe('');
  });

  it('writes each block type separated by blank lines', () => {
    expect(
      markdown(
        block('heading', [text('Plano')], { props: { level: 3 } }),
        paragraph(text('Texto')),
        block('quote', [text('Citação')]),
        block('codeBlock', [text('const a = 1;')], { props: { language: 'ts' } }),
        block('mathBlock', 'E = mc^2'),
      ),
    ).toBe('### Plano\n\nTexto\n\n> Citação\n\n```ts\nconst a = 1;\n```\n\n$$\nE = mc^2\n$$\n');
  });

  it('keeps list items tight and indents children to the content column', () => {
    expect(
      markdown(
        block('bulletListItem', [text('um')], { children: [block('bulletListItem', [text('filho')])] }),
        block('checkListItem', [text('fazer')], { props: { checked: false } }),
        block('checkListItem', [text('feito')], { props: { checked: true } }),
        block('numberedListItem', [text('primeiro')], { children: [paragraph(text('detalhe'))] }),
        block('numberedListItem', [text('segundo')]),
      ),
    ).toBe('- um\n  - filho\n- [ ] fazer\n- [x] feito\n\n1. primeiro\n\n   detalhe\n2. segundo\n');
  });

  it('respects the numbered start and separates a restarted list', () => {
    expect(
      markdown(
        block('numberedListItem', [text('três')], { props: { start: 3 } }),
        block('numberedListItem', [text('quatro')]),
        block('numberedListItem', [text('dez')], { props: { start: 10 } }),
      ),
    ).toBe('3. três\n4. quatro\n\n<!-- -->\n\n10. dez\n');
  });

  it('keeps the space after the marker of an empty item and flattens children Markdown cannot nest', () => {
    expect(markdown(block('checkListItem', [], { props: { checked: false } }))).toBe('- [ ] \n');
    expect(markdown(block('quote', [text('citação')], { children: [paragraph(text('filho'))] }))).toBe(
      '> citação\n\nfilho\n',
    );
  });

  it('writes styles, moving edge spaces outside the delimiters and nesting overlaps', () => {
    expect(
      markdown(
        paragraph(text('a '), text('negrito ', { bold: true }), text('itálico', { italic: true }), text(' fim')),
        paragraph(text('a', { bold: true, italic: true }), text('b', { italic: true }), text(' c')),
        paragraph(text('riscado', { strike: true }), text(' e '), text('`code`', { code: true })),
        paragraph(text('cor', { underline: true })),
      ),
    ).toBe('a **negrito** _itálico_ fim\n\n_**a**b_ c\n\n~~riscado~~ e `` `code` ``\n\ncor\n');
  });

  it('uses asterisks for italic inside a word', () => {
    expect(markdown(paragraph(text('re'), text('escre', { italic: true }), text('ver')))).toBe('re*escre*ver\n');
  });

  it('escapes Markdown syntax in text, block markers only at a line start', () => {
    expect(markdown(paragraph(text('a * b _ c [d] `e` \\ R$ 10 ~ f')))).toBe(
      'a \\* b \\_ c \\[d\\] \\`e\\` \\\\ R\\$ 10 \\~ f\n',
    );
    expect(markdown(paragraph(text('# título? - não + 2026. > nada')))).toBe('\\# título? - não + 2026. > nada\n');
    expect(markdown(paragraph(text('linha\n- dois\n3) três')))).toBe('linha\\\n\\- dois\\\n3\\) três\n');
    expect(markdown(block('heading', [text('Tópico #')], { props: { level: 1 } }))).toBe('# Tópico \\#\n');
  });

  it('writes hard breaks inside blocks and quotes, <br> inside list items, dropping those at the ends', () => {
    expect(markdown(paragraph(text('\num\ndois\n')))).toBe('um\\\ndois\n');
    expect(markdown(block('quote', [text('um\ndois')]))).toBe('> um\\\n> dois\n');
    expect(markdown(block('bulletListItem', [text('um\ndois')]))).toBe('- um<br>dois\n');
  });

  it('writes link addresses unchanged, between angle brackets when they need it', () => {
    const link = (href: string, ...content: JsonValue[]) => ({ type: 'link', href, content });
    expect(
      markdown(
        paragraph(link('https://exemplo.com/a b', text('com espaço'))),
        paragraph(link('https://pt.wikipedia.org/wiki/Foo_(bar)', text('wiki', { bold: true }))),
        paragraph(link('https://exemplo.com/a)b<c>', text('ímpar'))),
      ),
    ).toBe(
      '[com espaço](<https://exemplo.com/a b>)\n\n' +
        '**[wiki](https://pt.wikipedia.org/wiki/Foo_(bar))**\n\n' +
        '[ímpar](<https://exemplo.com/a\\)b\\<c\\>>)\n',
    );
  });

  it('fences code with more backticks than it contains', () => {
    expect(markdown(block('codeBlock', [text('a\n```\nb')]))).toBe('````\na\n```\nb\n````\n');
  });

  it('separates adjacent formulas and keeps raw LaTeX sources', () => {
    const math = (source: string) => ({ type: 'math', props: {}, content: source });
    expect(markdown(paragraph(text('Veja '), math('x'), math('$y$'), text(' e '), math('\\frac{')))).toBe(
      'Veja $x$<!-- -->$$ $y$ $$ e $\\frac{$\n',
    );
    expect(markdown(block('mathBlock', '\\begin{a}\n$$\n\\end{a}'))).toBe('$$$\n\\begin{a}\n$$\n\\end{a}\n$$$\n');
  });

  it('writes emphasis CommonMark reads, with tags where no delimiter is flanking', () => {
    expect(
      markdown(
        paragraph(
          text('Atenção!', { bold: true }),
          text('Leia isto e palavra'),
          text('(negrito)', { bold: true }),
          text('fim'),
        ),
        paragraph(
          text('negrito', { bold: true }),
          text(' e '),
          text('re'),
          text('itálico', { italic: true }),
          text('ver'),
        ),
      ),
    ).toBe(
      '<strong>Atenção!</strong>Leia isto e palavra<strong>(negrito)</strong>fim\n\n**negrito** e re*itálico*ver\n',
    );
    expect(markdown(paragraph(text('Nota:', { bold: true }), text('2', { italic: true }), text('x')))).toBe(
      '**Nota:**<em>2</em>x\n',
    );
  });

  it('keeps setext underlines, indentation and odd list numbers from changing the structure', () => {
    expect(markdown(paragraph(text('título falso\n===')))).toBe('título falso\\\n\\===\n');
    expect(markdown(paragraph(text('    quatro espaços')), block('quote', [text('\tcom tab')]))).toBe(
      'quatro espaços\n\n> com tab\n',
    );
    expect(markdown(block('bulletListItem', [text('     recuado')]))).toBe('- recuado\n');
    expect(
      markdown(
        block('numberedListItem', [text('negativo')], { props: { start: -1 } }),
        paragraph(text('entre')),
        block('numberedListItem', [text('enorme')], { props: { start: 12_345_678_901 } }),
      ),
    ).toBe('0. negativo\n\nentre\n\n999999999. enorme\n');
  });

  it('stays linear in the pieces of one block', () => {
    const math = { type: 'math', props: {}, content: 'x' };
    const started = performance.now();
    const breaks = markdown(paragraph(text('a\n'.repeat(100_000))));
    const formulas = markdown(paragraph(...Array.from({ length: 100_000 }, () => math)));
    expect(performance.now() - started).toBeLessThan(1000);
    expect(breaks.split('\n')).toHaveLength(100_001);
    expect(formulas.startsWith('$x$<!-- -->$x$')).toBe(true);
  });
});
