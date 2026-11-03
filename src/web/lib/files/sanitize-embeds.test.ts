import type { DocumentBlock } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { sanitizeEmbeds, validEmbed } from './sanitize-embeds';

const paragraph = (id: string, children: DocumentBlock[] = []): DocumentBlock => ({
  id,
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text: id, styles: {} }],
  children,
});
const card = (id: string, children: DocumentBlock[] = []): DocumentBlock => ({
  id,
  type: 'taskEmbed',
  props: { taskId: '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e' },
  children,
});
const figure = (id: string, children: DocumentBlock[] = []): DocumentBlock => ({
  id,
  type: 'drawingEmbed',
  props: { canvasId: '7c1e9a20-3b4d-4e5f-8a6b-7c8d9e0f1a2b' },
  children,
});
const ids = (blocks: readonly DocumentBlock[]): unknown[] =>
  blocks.map((block) => (block.children?.length ? [block.id, ids(block.children)] : block.id));

describe('sanitizeEmbeds', () => {
  it('puts what a Tab nested under a card or a figure right after it, in order', () => {
    const blocks = [paragraph('antes'), card('card', [paragraph('um'), paragraph('dois')]), paragraph('depois')];
    expect(ids(sanitizeEmbeds(blocks))).toEqual(['antes', 'card', 'um', 'dois', 'depois']);
    expect(sanitizeEmbeds(blocks)[1]).toEqual(card('card'));
    expect(ids(sanitizeEmbeds([figure('figura', [paragraph('legenda')])]))).toEqual(['figura', 'legenda']);
  });

  it('lifts at every depth and keeps the children of what it lifts', () => {
    const blocks = [
      paragraph('lista', [
        card('card', [paragraph('sob o card', [paragraph('neto')]), figure('figura', [paragraph('x')])]),
      ]),
    ];
    expect(ids(sanitizeEmbeds(blocks))).toEqual([['lista', ['card', ['sob o card', ['neto']], 'figura', 'x']]]);
  });

  it('gives back the same blocks when no embed holds children', () => {
    const blocks = [paragraph('a', [paragraph('b')]), card('card'), figure('figura')];
    expect(sanitizeEmbeds(blocks)).toBe(blocks);
    expect(sanitizeEmbeds([])).toEqual([]);
  });

  it('leaves what is not a block to the validator, but never an embed it cannot read', () => {
    const blocks = [123, null, { type: 'paragraph', children: 'x' }] as unknown as DocumentBlock[];
    expect(sanitizeEmbeds(blocks)).toBe(blocks);
    expect(sanitizeEmbeds([{ type: 'taskEmbed', children: 'x' }] as unknown as DocumentBlock[])).toEqual([]);
  });

  it('takes out an embed whose ID the server refuses, as a forged paste brings, and keeps what it held', () => {
    const forged = (id: string, children: DocumentBlock[] = []): DocumentBlock => ({
      id,
      type: 'taskEmbed',
      props: { taskId: 'NOT-A-UUID' },
      children,
    });
    const blocks = [paragraph('antes'), forged('falso', [paragraph('dentro')]), card('card'), paragraph('depois')];
    expect(ids(sanitizeEmbeds(blocks))).toEqual(['antes', 'dentro', 'card', 'depois']);
    const empty: DocumentBlock = { id: 'vazio', type: 'drawingEmbed', props: { canvasId: '' }, children: [] };
    const upper: DocumentBlock = { ...card('maiusculo'), props: { taskId: '0B4F2A4E-8F8C-4A5E-9D55-1F2A3B4C5D6E' } };
    expect(ids(sanitizeEmbeds([paragraph('lista', [empty, upper]), figure('figura')]))).toEqual(['lista', 'figura']);
  });
});

describe('validEmbed', () => {
  it('takes the lowercase item IDs the server takes, and nothing else', () => {
    expect(validEmbed(card('card'))).toBe(true);
    expect(validEmbed(figure('figura'))).toBe(true);
    expect(validEmbed({ type: 'taskEmbed', props: { taskId: 'NOT-A-UUID' } })).toBe(false);
    expect(validEmbed({ type: 'taskEmbed', props: {} })).toBe(false);
    expect(validEmbed({ type: 'drawingEmbed', props: { taskId: '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e' } })).toBe(false);
  });
});
