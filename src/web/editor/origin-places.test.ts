import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '#rich-text/domain';
import { setupBlockNoteEditor } from '../testing/blocknote-editor';
import { markerPlaces, type OriginMarker } from './origin-places';

const blockNote = setupBlockNoteEditor();

const paragraph = (id: string, ...pieces: { text: string; styles?: Record<string, boolean> }[]) => ({
  id,
  type: 'paragraph',
  content: pieces.map(({ text, styles = {} }) => ({ type: 'text', text, styles })),
});

const marker = (taskId: string, blockId: string, excerpt: string): OriginMarker => ({
  taskId,
  title: `Tarefa ${taskId}`,
  status: 'A fazer',
  ring: { index: 0, count: 3, done: false },
  blockId,
  excerpt,
});

/** The text of the document between two positions. */
const between = (doc: ReturnType<typeof blockNote.prosemirrorDoc>, from: number, to: number) =>
  doc.textBetween(from, to);

describe('markerPlaces', () => {
  const content = [
    paragraph(
      'a',
      { text: 'Antes. ' },
      { text: 'Gerar token', styles: { bold: true } },
      { text: ' pessoal no Perfil.' },
    ),
    paragraph('b', { text: 'Outro bloco.' }),
  ] as unknown as DocumentContent;

  it('puts the marker right after the excerpt, across formatting, and underlines the excerpt of the hovered one', () => {
    const doc = blockNote.prosemirrorDoc(content);
    const [place] = markerPlaces(doc, [marker('t1', 'a', 'Gerar token pessoal')], 't1');
    expect(place).toBeDefined();
    if (!place?.excerpt) throw new Error('No excerpt range.');
    expect(between(doc, place.excerpt.from, place.excerpt.to)).toBe('Gerar token pessoal');
    expect(place.at).toBe(place.excerpt.to);
  });

  it('goes to the end of the block when the excerpt changed, and nowhere without the block', () => {
    const doc = blockNote.prosemirrorDoc(content);
    const places = markerPlaces(doc, [marker('t1', 'b', 'texto que saiu'), marker('t2', 'gone', 'Antes.')]);
    expect(places).toHaveLength(1);
    expect(places[0]?.excerpt).toBeNull();
    expect(between(doc, 0, places[0]?.at ?? 0).endsWith('Outro bloco.')).toBe(true);
  });

  it('puts several markers of one excerpt side by side, in order, and matches whitespace runs as one space', () => {
    const doc = blockNote.prosemirrorDoc(content);
    const places = markerPlaces(doc, [marker('t1', 'a', 'Gerar   token'), marker('t2', 'a', 'Gerar token')]);
    expect(places.map((place) => place.marker.taskId)).toEqual(['t1', 't2']);
    expect(places[0]?.at).toBe(places[1]?.at);
    expect(between(doc, 0, places[0]?.at ?? 0).endsWith('Gerar token')).toBe(true);
  });
});

describe('the test editor', () => {
  it('opens a document with embeds and keeps them as they are', () => {
    const blocks = [
      paragraph('a', { text: 'Antes.' }),
      { id: 'b', type: 'taskEmbed', props: { taskId: '11111111-1111-4111-8111-111111111111' }, children: [] },
      { id: 'c', type: 'drawingEmbed', props: { canvasId: '22222222-2222-4222-8222-222222222222' }, children: [] },
    ] as unknown as DocumentContent;
    const reloaded = blockNote.reload(blocks);
    expect(reloaded.map((block) => [block.type, block.props])).toEqual([
      ['paragraph', expect.anything()],
      ['taskEmbed', { taskId: '11111111-1111-4111-8111-111111111111' }],
      ['drawingEmbed', { canvasId: '22222222-2222-4222-8222-222222222222' }],
    ]);
  });
});
