import { describe, expect, it } from 'vitest';
import type { DocumentBlock } from './document-models.js';
import { EMBED_LIMITS, embedIds, figureNumbers } from './embeds.js';

const [taskA, taskB, canvasA, canvasB] = [
  '7d1b6c1e-1f3e-4a8b-9c2d-0a1b2c3d4e5f',
  '8e2c7d2f-2a4f-4b9c-8d3e-1b2c3d4e5f60',
  '9f3d8e3a-3b5a-4cad-9e4f-2c3d4e5f6071',
  'a04e9f4b-4c6b-4dbe-8f5a-3d4e5f607182',
];
const task = (id: string, taskId: string): DocumentBlock => ({
  id,
  type: 'taskEmbed',
  props: { taskId },
  children: [],
});
const drawing = (id: string, canvasId: string): DocumentBlock => ({
  id,
  type: 'drawingEmbed',
  props: { canvasId },
  children: [],
});
const paragraph = (id: string, children?: DocumentBlock[]): DocumentBlock => ({
  id,
  type: 'paragraph',
  content: [{ type: 'text', text: 'texto', styles: {} }],
  ...(children ? { children } : {}),
});

describe('embeds', () => {
  const content = [
    drawing('d1', canvasA),
    paragraph('p1', [task('t1', taskA), drawing('d2', canvasB)]),
    task('t2', taskB),
    task('t3', taskA),
    drawing('d3', canvasA),
  ];

  it('lists the embedded IDs once each, in reading order, nested ones included', () => {
    expect(embedIds(content)).toEqual({ taskIds: [taskA, taskB], canvasIds: [canvasA, canvasB] });
    expect(embedIds([paragraph('p')])).toEqual({ taskIds: [], canvasIds: [] });
  });

  it('numbers the figures by block in reading order, a repeated drawing counted each time', () => {
    expect([...figureNumbers(content)]).toEqual([
      ['d1', 1],
      ['d2', 2],
      ['d3', 3],
    ]);
    // A block without an ID still takes its number.
    expect([...figureNumbers([{ type: 'drawingEmbed', props: { canvasId: canvasA } }, drawing('d', canvasB)])]).toEqual(
      [['d', 2]],
    );
  });

  it('allows 200 embeds per document', () => {
    expect(EMBED_LIMITS.perDocument).toBe(200);
  });
});
