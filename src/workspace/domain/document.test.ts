import { describe, expect, it } from 'vitest';
import {
  documentLead,
  documentPlainText,
  findBlock,
  MAX_DOCUMENT_BYTES,
  RECOVERY_DOCUMENT_LIMITS,
  readDocumentContent,
  withBlockIds,
} from './document.js';
import { EMBED_LIMITS } from './embeds.js';
import type { DocumentBlock } from './models.js';
import { excerptPresent } from './task-source.js';

const text = (value: string) => [{ type: 'text', text: value, styles: {} }];
const block = (type: string, value: string, children?: DocumentBlock[]): DocumentBlock => ({
  type,
  content: text(value),
  ...(children ? { children } : {}),
});

describe('document lead', () => {
  it('is the first text that is not a heading, children included', () => {
    expect(
      documentLead([
        block('heading', 'Por que existe'),
        block('paragraph', '   '),
        block('paragraph', 'Espaço pessoal e minimalista.'),
        block('paragraph', 'Depois.'),
      ]),
    ).toBe('Espaço pessoal e minimalista.');
    expect(documentLead([block('heading', 'Plano', [block('bulletListItem', 'Primeiro passo')])])).toBe(
      'Primeiro passo',
    );
    expect(documentLead([block('codeBlock', 'pnpm check')])).toBe('pnpm check');
  });
  it('falls back to the headings, a line each, and is empty without text', () => {
    expect(documentLead([block('heading', 'Plano'), block('paragraph', ''), block('heading', 'Etapas')])).toBe(
      'Plano\nEtapas',
    );
    expect(documentLead([block('paragraph', '')])).toBe('');
    expect(documentLead([])).toBe('');
  });
});

describe('block ids', () => {
  it('gives each block without an id a new one, never one already taken, and keeps the others', () => {
    const ids = ['kept', 'quote-id', 'child-id'];
    const blocks = [{ ...block('paragraph', 'a'), id: 'kept' }, block('quote', 'b', [block('mathBlock', 'y')])];
    const filled = withBlockIds(blocks, () => ids.shift() ?? 'exhausted');
    expect(filled.map((item) => item.id)).toEqual(['kept', 'quote-id']);
    expect(filled[1]?.children?.[0]).toEqual({ ...block('mathBlock', 'y'), id: 'child-id' });
    expect(blocks[1]?.id).toBeUndefined();
  });
  it('returns the same blocks when each one has an id', () => {
    const blocks = [{ ...block('paragraph', 'a', [{ ...block('paragraph', 'b'), id: 'b' }]), id: 'a' }];
    expect(withBlockIds(blocks, () => 'unused')).toBe(blocks);
  });
});

describe('document format', () => {
  it('preserves supported blocks and extracts nested text and link labels', () => {
    const content = readDocumentContent([
      {
        id: 'root',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Plano', styles: { bold: true } }],
        children: [
          {
            id: 'child',
            type: 'paragraph',
            content: [
              {
                type: 'link',
                href: 'https://example.com',
                content: [{ type: 'text', text: 'Referência', styles: {} }],
              },
            ],
          },
        ],
      },
    ]);
    expect(documentPlainText(content)).toBe('Plano\nReferência');
    expect(findBlock(content, 'child')?.type).toBe('paragraph');
    expect(findBlock(content, 'missing')).toBeUndefined();
  });

  it('preserves display and inline LaTeX in the shapes emitted by the installed math package', () => {
    const input = [
      {
        id: 'display',
        type: 'mathBlock',
        props: {},
        content: [{ type: 'text', text: 'E=mc^2', styles: {} }],
        children: [],
      },
      {
        id: 'inline',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'A identidade ', styles: {} },
          { type: 'math', props: {}, content: String.raw`\sin^2(x)+\cos^2(x)=1` },
          { type: 'text', text: ' é útil.', styles: {} },
        ],
      },
    ];
    const parsed = readDocumentContent(input);
    expect(parsed).toEqual(input);
    expect(documentPlainText(parsed)).toBe('E=mc^2\nA identidade \\sin^2(x)+\\cos^2(x)=1 é útil.');
  });

  it('keeps empty and unfinished LaTeX editable instead of treating it as invalid document data', () => {
    const input = [
      { type: 'mathBlock', props: {}, content: '' },
      { type: 'mathBlock', content: [{ type: 'text', text: String.raw`\frac{a}{`, styles: {} }] },
      { type: 'paragraph', content: [{ type: 'math', props: {}, content: String.raw`\unknowncommand{` }] },
      { type: 'paragraph', content: [{ type: 'math', content: '' }] },
    ];
    expect(readDocumentContent(input)).toEqual(input);
    expect(documentPlainText(readDocumentContent(input))).toContain(String.raw`\frac{a}{`);
  });

  it.each([
    { type: 'mathBlock', props: { latex: 'x^2' } },
    { type: 'mathBlock', props: { textAlignment: 'center' } },
    { type: 'mathBlock', content: { latex: 'x^2' } },
    { type: 'mathBlock', content: [{ type: 'link', href: 'https://example.com', content: 'x' }] },
    { type: 'mathBlock', content: [{ type: 'math', props: {}, content: 'x' }] },
    { type: 'paragraph', content: [{ type: 'math', props: { latex: 'x' }, content: 'x' }] },
    { type: 'paragraph', content: [{ type: 'math', props: null, content: 'x' }] },
    { type: 'paragraph', content: [{ type: 'math', content: 42 }] },
    { type: 'paragraph', content: [{ type: 'math', content: null }] },
    { type: 'paragraph', content: [{ type: 'math' }] },
    { type: 'paragraph', content: [{ type: 'math', content: [{ type: 'text', text: 'x', styles: {} }] }] },
    { type: 'paragraph', content: [{ type: 'math', content: [{ type: 'math', content: 'x' }] }] },
    {
      type: 'paragraph',
      content: [{ type: 'link', href: 'https://example.com', content: [{ type: 'math', content: 'x' }] }],
    },
    { type: 'codeBlock', content: [{ type: 'math', content: 'x' }] },
  ])('rejects malformed math and math inside plain-only scopes: %j', (block) => {
    expect(() => readDocumentContent([block])).toThrow();
  });

  it('counts LaTeX toward the existing UTF-8 document size limit', () => {
    expect(() => readDocumentContent([{ type: 'mathBlock', content: 'x'.repeat(MAX_DOCUMENT_BYTES) }])).toThrow(
      '1 MiB',
    );
    expect(() =>
      readDocumentContent([
        { type: 'paragraph', content: [{ type: 'math', content: 'x'.repeat(MAX_DOCUMENT_BYTES) }] },
      ]),
    ).toThrow('1 MiB');
  });

  it('rejects malformed, unsupported and ambiguous documents', () => {
    expect(() => readDocumentContent({})).toThrow();
    expect(() => readDocumentContent([{ type: 'image', props: { url: 'https://example.com/image.jpg' } }])).toThrow(
      'suportado',
    );
    expect(() => readDocumentContent([{ type: 'paragraph', content: [{ type: 'text', text: 123 }] }])).toThrow('texto');
    expect(() =>
      readDocumentContent([
        { id: 'same', type: 'paragraph' },
        { id: 'same', type: 'paragraph' },
      ]),
    ).toThrow('repetidos');
    expect(() => readDocumentContent(JSON.parse('[{"type":"paragraph","props":{"__proto__":{}}}]'))).toThrow(
      'propriedade',
    );
  });

  it.each(['javascript:alert(1)', 'data:text/html,hello', 'java\nscript:alert(1)', 'vbscript:msgbox(1)'])(
    'rejects dangerous links: %s',
    (href) => {
      expect(() =>
        readDocumentContent([{ type: 'paragraph', content: [{ type: 'link', href, content: [] }] }]),
      ).toThrow();
    },
  );

  it('enforces UTF-8 byte size instead of character count', () => {
    expect(() => readDocumentContent([{ type: 'paragraph', content: 'a'.repeat(MAX_DOCUMENT_BYTES) }])).toThrow(
      '1 MiB',
    );
    expect(() => readDocumentContent([{ type: 'paragraph', content: '😀'.repeat(MAX_DOCUMENT_BYTES / 3) }])).toThrow(
      '1 MiB',
    );
  });

  it('recovers oversized valid local drafts while the RPC default still refuses them', () => {
    const oversized = [{ type: 'paragraph', content: 'a'.repeat(MAX_DOCUMENT_BYTES + 1000) }];
    expect(() => readDocumentContent(oversized)).toThrow('1 MiB');
    expect(readDocumentContent(oversized, RECOVERY_DOCUMENT_LIMITS)).toEqual(oversized);
    expect(() => readDocumentContent(oversized)).toThrow('1 MiB');
    expect(() =>
      readDocumentContent(
        [{ type: 'paragraph', content: 'a'.repeat(RECOVERY_DOCUMENT_LIMITS.maxBytes) }],
        RECOVERY_DOCUMENT_LIMITS,
      ),
    ).toThrow('5 MiB');
  });

  it('allows bounded recovery of too many blocks without weakening structural validation', () => {
    const blocks = Array.from({ length: 5001 }, () => ({ type: 'paragraph', content: '' }));
    expect(() => readDocumentContent(blocks)).toThrow('5.000 blocos');
    expect(readDocumentContent(blocks, RECOVERY_DOCUMENT_LIMITS)).toHaveLength(5001);
    expect(() => readDocumentContent([{ type: 'unsupported' }], RECOVERY_DOCUMENT_LIMITS)).toThrow('suportado');
    expect(() => readDocumentContent([], { maxBytes: Infinity })).toThrow('Limite');
    expect(() => readDocumentContent([], { maxBlocks: 20_001 })).toThrow('Limite');
  });

  it('rejects excessively nested documents before rendering', () => {
    let content: unknown[] = [{ type: 'paragraph' }];
    for (let i = 0; i < 50; i++) content = [{ type: 'paragraph', children: content }];
    expect(() => readDocumentContent(content)).toThrow('profund');
  });

  it.each([
    { type: 'heading', props: { level: '2' } },
    { type: 'heading', props: { level: 99 } },
    { type: 'checkListItem', props: { checked: 'yes' } },
    { type: 'paragraph', props: { textAlignment: 'sideways' } },
    { type: 'paragraph', props: { backgroundColor: {} } },
    { type: 'paragraph', content: [{ type: 'text', text: 'Hello', styles: { bold: 'false' } }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Hello', styles: { fontSize: 200 } }] },
    { type: 'codeBlock', content: [{ type: 'link', href: 'https://example.com', content: 'Code link' }] },
    {
      type: 'paragraph',
      content: [
        {
          type: 'link',
          href: 'https://example.com',
          content: [{ type: 'link', href: 'https://example.org', content: 'Nested' }],
        },
      ],
    },
  ])('rejects malformed properties and styles before storage: %j', (block) => {
    expect(() => readDocumentContent([block])).toThrow();
  });
});

describe('embeds in the document format', () => {
  const taskId = '7d1b6c1e-1f3e-4a8b-9c2d-0a1b2c3d4e5f';
  const canvasId = '9f3d8e3a-3b5a-4cad-9e4f-2c3d4e5f6071';
  const embeds = { embeds: true };
  const task = (extra: Record<string, unknown> = {}) => ({
    type: 'taskEmbed',
    props: { taskId },
    children: [],
    ...extra,
  });
  const drawing = { type: 'drawingEmbed', props: { canvasId } };

  it('takes task and drawing embeds only with the option, which a description does not pass', () => {
    const content = [block('paragraph', 'Antes'), { id: 'e1', ...task() }, { id: 'e2', ...drawing }];
    expect(readDocumentContent(content, {}, embeds)).toEqual(content);
    for (const embed of [task(), drawing])
      expect(() => readDocumentContent([embed])).toThrow('A descrição não aceita itens incorporados.');
  });

  it('keeps an embed to its one ID prop, with no text and no blocks inside', () => {
    const props = 'As propriedades do item incorporado são inválidas.';
    for (const bad of [
      { type: 'taskEmbed', children: [] },
      task({ props: {} }),
      task({ props: { taskId, textColor: 'red' } }),
      task({ props: { canvasId: taskId } }),
      task({ props: { taskId: 'não é um id' } }),
      task({ props: { taskId: `${taskId} ` } }),
      task({ props: { taskId: taskId.toUpperCase() } }),
      task({ props: { taskId: 42 } }),
      { type: 'drawingEmbed', props: { taskId } },
    ])
      expect(() => readDocumentContent([bad], {}, embeds)).toThrow(props);
    expect(() => readDocumentContent([task({ content: text('x') })], {}, embeds)).toThrow(
      'Um item incorporado não tem texto.',
    );
    expect(() => readDocumentContent([task({ content: [] })], {}, embeds)).toThrow(
      'Um item incorporado não tem texto.',
    );
    expect(() => readDocumentContent([task({ children: [block('paragraph', 'x')] })], {}, embeds)).toThrow(
      'Um item incorporado não tem blocos internos.',
    );
    expect(() => readDocumentContent([task({ id: 'same' }), task({ id: 'same' })], {}, embeds)).toThrow('repetidos');
  });

  it('takes 200 embeds, nested ones counted, and refuses the 201st', () => {
    const many = Array.from({ length: EMBED_LIMITS.perDocument - 1 }, () => task());
    expect(readDocumentContent([...many, block('paragraph', 'x', [task()])], {}, embeds)).toHaveLength(200);
    expect(() => readDocumentContent([...many, task(), block('paragraph', 'x', [task()])], {}, embeds)).toThrow(
      'Um documento aceita até 200 itens incorporados.',
    );
  });

  it('leaves embeds out of the text, the lead and the excerpt check', () => {
    const content = [
      { id: 'e1', ...task() },
      block('paragraph', 'Gerar token'),
      { id: 'e2', ...drawing },
      block('paragraph', 'pessoal'),
    ] as DocumentBlock[];
    expect(documentPlainText(content)).toBe('Gerar token\npessoal');
    expect(documentLead(content)).toBe('Gerar token');
    const document = { content, plainText: documentPlainText(content) };
    expect(excerptPresent(document, null, 'token pessoal')).toBe(true);
    expect(excerptPresent(document, 'e1', taskId)).toBe(false);
  });
});
