import type { DocumentBlock } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { liftEmbedChildren } from './embed-children';

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

describe('liftEmbedChildren', () => {
  it('puts what a Tab nested under a card or a figure right after it, in order', () => {
    const blocks = [paragraph('antes'), card('card', [paragraph('um'), paragraph('dois')]), paragraph('depois')];
    expect(ids(liftEmbedChildren(blocks))).toEqual(['antes', 'card', 'um', 'dois', 'depois']);
    expect(liftEmbedChildren(blocks)[1]).toEqual(card('card'));
    expect(ids(liftEmbedChildren([figure('figura', [paragraph('legenda')])]))).toEqual(['figura', 'legenda']);
  });

  it('lifts at every depth and keeps the children of what it lifts', () => {
    const blocks = [
      paragraph('lista', [
        card('card', [paragraph('sob o card', [paragraph('neto')]), figure('figura', [paragraph('x')])]),
      ]),
    ];
    expect(ids(liftEmbedChildren(blocks))).toEqual([['lista', ['card', ['sob o card', ['neto']], 'figura', 'x']]]);
  });

  it('gives back the same blocks when no embed holds children', () => {
    const blocks = [paragraph('a', [paragraph('b')]), card('card'), figure('figura')];
    expect(liftEmbedChildren(blocks)).toBe(blocks);
    expect(liftEmbedChildren([])).toEqual([]);
  });

  it('leaves what is not a block to the validator', () => {
    const blocks = [123, null, { type: 'taskEmbed', children: 'x' }] as unknown as DocumentBlock[];
    expect(liftEmbedChildren(blocks)).toBe(blocks);
  });
});
