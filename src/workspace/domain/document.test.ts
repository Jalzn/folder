import { describe, expect, it } from 'vitest';
import {
  documentPlainText,
  findBlock,
  MAX_DOCUMENT_BYTES,
  RECOVERY_DOCUMENT_LIMITS,
  readDocumentContent,
} from './document.js';

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
