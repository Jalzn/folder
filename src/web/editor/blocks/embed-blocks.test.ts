import { EMBED_TYPES } from '@tinyfold/rich-text/domain';
import { describe, expect, it } from 'vitest';
import { EMBED_BLOCKS, EMBED_CLIPBOARD_MARK, embedBlock, embedBlockType, embedOf, isEmbedType } from './embed-blocks';

const ID = '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e';

describe('embed blocks', () => {
  it('name every embed type of the domain, and only those', () => {
    expect(Object.keys(EMBED_BLOCKS).sort()).toEqual([...EMBED_TYPES].sort());
    expect(EMBED_TYPES.every(isEmbedType)).toBe(true);
    expect(['paragraph', 'toString', 'constructor', ''].some(isEmbedType)).toBe(false);
  });

  it('go from an item kind to its block and back, from a block or an editor node', () => {
    expect(embedBlock('task', ID)).toEqual({ type: 'taskEmbed', props: { taskId: ID } });
    expect(embedBlock('drawing', ID)).toEqual({ type: 'drawingEmbed', props: { canvasId: ID } });
    expect(embedBlockType('drawing')).toBe('drawingEmbed');
    expect(embedOf(embedBlock('task', ID))).toEqual({ kind: 'task', id: ID });
    expect(embedOf({ type: { name: 'drawingEmbed' }, attrs: { canvasId: ID } })).toEqual({ kind: 'drawing', id: ID });
    expect(embedOf({ type: 'paragraph', props: {} })).toBeNull();
  });

  it('find embeds in BlockNote’s clipboard HTML', () => {
    expect(EMBED_CLIPBOARD_MARK.test('<div data-content-type="taskEmbed">')).toBe(true);
    expect(EMBED_CLIPBOARD_MARK.test('<div data-content-type="drawingEmbed">')).toBe(true);
    expect(EMBED_CLIPBOARD_MARK.test('<div data-content-type="paragraph">')).toBe(false);
  });
});
