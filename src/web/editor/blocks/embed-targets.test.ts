import type { DocumentBlock } from '@tinyfold/workspace/domain';
import type { Node } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { setupBlockNoteEditor } from '../../testing/blocknote-editor';
import { blockPlaces } from './embed-places';
import { embedSelectionOf, isEmbedSelected } from './embed-selection';
import { deleteTarget, edgeTarget, extendTarget, pageTarget, stepTarget } from './embed-targets';

const harness = setupBlockNoteEditor();

const TASK = '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e';
const p = (id: string, words = id): DocumentBlock => ({
  id,
  type: 'paragraph',
  props: {},
  content: words ? [{ type: 'text', text: words, styles: {} }] : [],
  children: [],
});
const h = (id: string): DocumentBlock => ({ ...p(id), type: 'heading', props: { level: 2 } });
const card = (id: string): DocumentBlock => ({ id, type: 'taskEmbed', props: { taskId: TASK }, children: [] });

const place = (doc: Node, id: string) => {
  const found = blockPlaces(doc).find((each) => each.id === id);
  if (!found) throw new Error(`no block ${id}`);
  return found;
};
const state = (doc: Node, selection: (doc: Node) => NodeSelection | TextSelection) =>
  EditorState.create({ doc, selection: selection(doc) });
const node = (id: string) => (doc: Node) => NodeSelection.create(doc, place(doc, id).from);
const caret = (id: string, side: 'start' | 'end') => (doc: Node) =>
  TextSelection.create(doc, side === 'start' ? place(doc, id).from + 1 : place(doc, id).to - 1);

describe('the embed selection', () => {
  const doc = harness.prosemirrorDoc([p('antes'), card('t1'), card('t2'), p('depois')]);

  it('reads an embed selected as a node, a range grown from one, and a text', () => {
    expect(embedSelectionOf(state(doc, node('t1')))).toMatchObject({ kind: 'embed', embed: { id: 't1' } });
    expect(isEmbedSelected(state(doc, node('t1')))).toBe(true);
    const grown = state(doc, (d) => TextSelection.create(d, place(d, 't1').from, place(d, 'depois').to - 1));
    expect(embedSelectionOf(grown)).toMatchObject({ kind: 'range-from-embed', embed: { id: 't1' } });
    expect(embedSelectionOf(state(doc, caret('antes', 'end')))).toEqual({ kind: 'text' });
    expect(isEmbedSelected(state(doc, caret('antes', 'end')))).toBe(false);
  });
});

describe('the embed keys’ targets', () => {
  const doc = harness.prosemirrorDoc([p('antes'), card('t1'), card('t2'), card('t3'), h('titulo'), p('fim')]);

  it('step a block at a time from an embed, and from a text’s edge only sideways', () => {
    expect(stepTarget(state(doc, node('t2')), true, true)).toEqual({ to: 't3', side: 'start' });
    expect(stepTarget(state(doc, node('t2')), false, true)).toEqual({ to: 't1', side: 'end' });
    expect(stepTarget(state(doc, node('t3')), true, false)).toEqual({ to: 'titulo', side: 'start' });
    expect(stepTarget(state(doc, caret('antes', 'end')), true, false)).toEqual({ to: 't1', side: 'start' });
    expect(stepTarget(state(doc, caret('antes', 'end')), true, true)).toBeNull();
    expect(stepTarget(state(doc, caret('titulo', 'start')), false, false)).toEqual({ to: 't3', side: 'end' });
  });

  it('extend from an embed to the next block’s far edge, and consume the key at the document’s edge', () => {
    const t3 = place(doc, 't3');
    const titulo = place(doc, 'titulo');
    expect(extendTarget(state(doc, node('t3')), true)).toEqual({ range: { anchor: t3.from, head: titulo.to - 1 } });
    expect(extendTarget(state(doc, node('t2')), true)).toEqual({
      range: { anchor: place(doc, 't2').from, head: t3.to },
    });
    const top = harness.prosemirrorDoc([card('t1'), p('fim')]);
    expect(extendTarget(state(top, node('t1')), false)).toBe('consume');
    expect(extendTarget(state(doc, caret('antes', 'end')), true)).toBeNull();
  });

  it('shrink a grown range back onto its embed, which is selected again', () => {
    const grown = state(doc, (d) => TextSelection.create(d, place(d, 't2').from, place(d, 't3').to));
    expect(extendTarget(grown, false)).toEqual({ to: 't2', side: 'start' });
  });

  it('go to the document’s edges from an embed only, and keep Page Up and Down there', () => {
    expect(edgeTarget(state(doc, node('t3')), true)).toEqual({ to: 'fim', side: 'end' });
    expect(edgeTarget(state(doc, node('t1')), false)).toEqual({ to: 'antes', side: 'start' });
    expect(edgeTarget(state(doc, caret('fim', 'start')), true)).toBeNull();
    expect(pageTarget(state(doc, node('t1')))).toBe('consume');
    expect(pageTarget(state(doc, caret('antes', 'end')))).toBeNull();
  });

  it('select the embed beside a caret first, remove a selected one, and leave a heading to BlockNote', () => {
    const after = harness.prosemirrorDoc([p('antes'), card('t1'), p('depois')]);
    expect(deleteTarget(state(after, caret('depois', 'start')), false)).toEqual({ select: 't1' });
    expect(deleteTarget(state(after, caret('antes', 'end')), true)).toEqual({ select: 't1' });
    expect(deleteTarget(state(after, node('t1')), false)).toEqual({ remove: 't1' });
    expect(deleteTarget(state(after, caret('depois', 'end')), false)).toBeNull();
    expect(deleteTarget(state(doc, caret('titulo', 'start')), false)).toBeNull();
  });
});
