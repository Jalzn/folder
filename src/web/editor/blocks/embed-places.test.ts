import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '#rich-text/domain';
import { setupBlockNoteEditor } from '../../testing/blocknote-editor';
import { blockAfter, blockBefore, blockPlaces } from './embed-places';

const editor = setupBlockNoteEditor();

const TASK = '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e';
const CANVAS = '7c1e9a20-3b4d-4e5f-8a6b-7c8d9e0f1a2b';
const paragraph = (id: string, children: DocumentContent = []) => ({
  id,
  type: 'paragraph',
  props: {},
  content: [{ type: 'text', text: id, styles: {} }],
  children,
});
const card = (id: string) => ({ id, type: 'taskEmbed', props: { taskId: TASK }, children: [] });
const figure = (id: string) => ({ id, type: 'drawingEmbed', props: { canvasId: CANVAS }, children: [] });

describe('blockPlaces', () => {
  const doc = editor.prosemirrorDoc([
    paragraph('antes'),
    card('t1'),
    card('t2'),
    figure('d1'),
    paragraph('lista', [card('t3'), paragraph('filho')]),
    paragraph('depois'),
  ]);
  const places = blockPlaces(doc);
  const at = (id: string) => places.find((place) => place.id === id) ?? places[0];

  it('lists every block in reading order, a block before its children', () => {
    expect(places.map((place) => [place.id, place.type])).toEqual([
      ['antes', 'paragraph'],
      ['t1', 'taskEmbed'],
      ['t2', 'taskEmbed'],
      ['d1', 'drawingEmbed'],
      ['lista', 'paragraph'],
      ['t3', 'taskEmbed'],
      ['filho', 'paragraph'],
      ['depois', 'paragraph'],
    ]);
    expect(doc.nodeAt(at('t2')?.from ?? 0)?.type.name).toBe('taskEmbed');
  });

  it('goes from one embed of a run to the next and back, and out to the text on both sides', () => {
    const forward = (id: string) => blockAfter(doc, at(id)?.to ?? 0)?.id;
    const back = (id: string) => blockBefore(doc, at(id)?.from ?? 0)?.id;
    expect(['t1', 't2', 'd1', 'lista', 't3', 'filho'].map(forward)).toEqual([
      't2',
      'd1',
      'lista',
      't3',
      'filho',
      'depois',
    ]);
    expect(['depois', 'filho', 't3', 'lista', 'd1', 't2', 't1'].map(back)).toEqual([
      'filho',
      't3',
      'lista',
      'd1',
      't2',
      't1',
      'antes',
    ]);
  });

  it('finds nothing past the document’s edges', () => {
    expect(blockBefore(doc, at('antes')?.from ?? 0)).toBeNull();
    expect(blockAfter(doc, at('depois')?.to ?? 0)).toBeNull();
  });

  it('takes a position between two embeds, as a gap cursor has, to the block on that side', () => {
    const between = (at('t1')?.to ?? 0) + 1;
    expect(blockAfter(doc, between)?.id).toBe('t2');
    expect(blockBefore(doc, between)?.id).toBe('t1');
  });
});
