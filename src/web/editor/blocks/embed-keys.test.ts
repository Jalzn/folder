import type { DocumentBlock, DocumentContent } from '@tinyfold/rich-text/domain';
import { GapCursor } from '@tiptap/pm/gapcursor';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';
import { type MountedBlockNoteEditor, setupBlockNoteEditor } from '../../testing/blocknote-editor';
import { createEmbedKeys } from './embed-keys';
import { blockPlaces } from './embed-places';

/**
 * Where the embed keys take the selection (docs/etapas/11-documento-desenho.md, "Teclado e Esc"), on the
 * document's schema in a mounted editor: the keys reach the extension's keymap as a person's would, without
 * the browser's own moves nor Chrome's drift (e2e/embed-keys.spec.ts has those).
 */
const harness = setupBlockNoteEditor();

const TASK = '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e';
const CANVAS = '7c1e9a20-3b4d-4e5f-8a6b-7c8d9e0f1a2b';
const text = (type: string, id: string, words = id, props: Record<string, string | number> = {}): DocumentBlock => ({
  id,
  type,
  props,
  content: words ? [{ type: 'text', text: words, styles: {} }] : [],
  children: [],
});
const p = (id: string, words = id) => text('paragraph', id, words);
const card = (id: string): DocumentBlock => ({ id, type: 'taskEmbed', props: { taskId: TASK }, children: [] });
const figure = (id: string): DocumentBlock => ({ id, type: 'drawingEmbed', props: { canvasId: CANVAS }, children: [] });

let open: { editor: MountedBlockNoteEditor; close: () => void } | null = null;
let removed: string[] = [];
afterEach(() => {
  open?.close();
  open = null;
});

function mount(blocks: DocumentContent) {
  removed = [];
  open = harness.mount(blocks, [
    createEmbedKeys({
      remove: (id) => removed.push(id),
      describe: () => ({ plain: '', markdown: '', link: null }),
    }),
  ]);
  return open.editor;
}

type Mods = { shift?: boolean; meta?: boolean; ctrl?: boolean; alt?: boolean; composing?: boolean };
/** A keydown through the editor's view, as the keymaps take it; true when a handler took the key. */
function press(editor: MountedBlockNoteEditor, key: string, mods: Mods = {}) {
  const view = editor.prosemirrorView;
  if (!view) throw new Error('not mounted');
  const KeyboardEvent = (globalThis as unknown as { window: { KeyboardEvent: typeof globalThis.KeyboardEvent } }).window
    .KeyboardEvent;
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: Boolean(mods.shift),
    metaKey: Boolean(mods.meta),
    ctrlKey: Boolean(mods.ctrl),
    altKey: Boolean(mods.alt),
    isComposing: Boolean(mods.composing),
    bubbles: true,
    cancelable: true,
  });
  return Boolean(view.someProp('handleKeyDown', (handle) => handle(view, event)));
}

const placeOf = (editor: MountedBlockNoteEditor, id: string) => {
  const place = blockPlaces(editor.prosemirrorState.doc).find((each) => each.id === id);
  if (!place) throw new Error(`no block ${id}`);
  return place;
};

/** The selection in words: `node:t1`, `caret:antes@end`, `range:t2..depois@end`, `gap:t2`. */
function where(editor: MountedBlockNoteEditor): string {
  const { selection, doc } = editor.prosemirrorState;
  const places = blockPlaces(doc);
  const name = (pos: number) => {
    const inText = places.find((place) => place.from < pos && pos < place.to);
    if (inText) {
      const offset = pos - inText.from - 1;
      const size = inText.to - inText.from - 2;
      return `${inText.id}@${offset === 0 ? 'start' : offset === size ? 'end' : offset}`;
    }
    const start = places.find((place) => place.from === pos);
    if (start) return `${start.id}<`;
    const end = places.find((place) => place.to === pos);
    return end ? `${end.id}>` : `?${pos}`;
  };
  if (selection instanceof NodeSelection) return `node:${places.find((place) => place.from === selection.from)?.id}`;
  if (selection.toJSON().type === 'gapcursor') return `gap:${name(selection.from)}`;
  if (selection.empty) return `caret:${name(selection.head)}`;
  return `range:${name(selection.anchor)}..${name(selection.head)}`;
}

const selectBlock = (editor: MountedBlockNoteEditor, id: string, side?: 'start' | 'end') =>
  side ? editor.setTextCursorPosition(id, side) : editor.setTextCursorPosition(id);

/** Presses the key `times` times and gives where the selection went after each. */
const walk = (editor: MountedBlockNoteEditor, key: string, times: number, mods: Mods = {}) =>
  Array.from({ length: times }, () => {
    press(editor, key, mods);
    return where(editor);
  });

describe('the arrows through embeds', () => {
  it('↓ and ↑ go through a run of three cards a block at a time, and out to the text on both sides', () => {
    const editor = mount([p('antes'), card('t1'), card('t2'), card('t3'), p('depois')]);
    selectBlock(editor, 't1');
    expect(walk(editor, 'ArrowDown', 3)).toEqual(['node:t2', 'node:t3', 'caret:depois@start']);
    selectBlock(editor, 't3');
    expect(walk(editor, 'ArrowUp', 3)).toEqual(['node:t2', 'node:t1', 'caret:antes@end']);
  });

  it('→ and ← do the same, and select the embed beside a caret at the edge of a text', () => {
    const editor = mount([p('antes'), card('t1'), figure('d1'), p('depois')]);
    selectBlock(editor, 'antes', 'end');
    expect(walk(editor, 'ArrowRight', 3)).toEqual(['node:t1', 'node:d1', 'caret:depois@start']);
    selectBlock(editor, 'depois', 'start');
    expect(walk(editor, 'ArrowLeft', 3)).toEqual(['node:d1', 'node:t1', 'caret:antes@end']);
  });

  it('leaves ↑ and ↓ from a text, and ← → inside a text, to ProseMirror', () => {
    const editor = mount([p('antes'), card('t1'), p('depois')]);
    selectBlock(editor, 'antes', 'end');
    expect(press(editor, 'ArrowDown')).toBe(false);
    selectBlock(editor, 'depois', 'end');
    expect(press(editor, 'ArrowUp')).toBe(false);
    expect(press(editor, 'ArrowLeft')).toBe(false);
    selectBlock(editor, 'antes', 'start');
    expect(press(editor, 'ArrowRight')).toBe(false);
  });

  it('takes a gap cursor to the block on the key’s side', () => {
    const editor = mount([p('antes'), card('t1'), card('t2'), p('depois')]);
    const gap = (side: 'down' | 'up') => {
      const { state } = editor.prosemirrorView ?? { state: null };
      if (!state) throw new Error('not mounted');
      const pos = placeOf(editor, 't2').from;
      editor.prosemirrorView?.dispatch(state.tr.setSelection(new GapCursor(state.doc.resolve(pos))));
      expect(where(editor)).toBe('gap:t2<');
      press(editor, side === 'down' ? 'ArrowDown' : 'ArrowUp');
      return where(editor);
    };
    expect(gap('down')).toBe('node:t2');
    expect(gap('up')).toBe('node:t1');
  });

  it('leaves the document’s edges to ProseMirror, which makes room to write there, and a composition alone', () => {
    const editor = mount([card('t1'), card('t2')]);
    selectBlock(editor, 't1');
    press(editor, 'ArrowUp');
    expect(where(editor)).toBe('gap:t1<');
    selectBlock(editor, 't1');
    // During a composition the embed keys stand aside: no step to the next embed by the editor's API.
    press(editor, 'ArrowDown', { composing: true });
    expect(where(editor)).not.toBe('node:t2');
  });
});

describe('⇧↓ and ⇧↑ from an embed', () => {
  it('make a range a block at a time, shrink it back, and select the embed again on it', () => {
    const editor = mount([p('antes'), card('t1'), card('t2'), card('t3'), p('depois'), p('fim')]);
    selectBlock(editor, 't2');
    expect(walk(editor, 'ArrowDown', 3, { shift: true })).toEqual([
      'range:t2<..t3>',
      'range:t2<..depois@end',
      'range:t2<..fim@end',
    ]);
    expect(walk(editor, 'ArrowUp', 4, { shift: true })).toEqual([
      'range:t2<..depois@end',
      'range:t2<..t3>',
      'node:t2',
      'range:t2>..t1<',
    ]);
    expect(walk(editor, 'ArrowUp', 2, { shift: true })).toEqual(['range:t2>..antes@start', 'range:t2>..antes@start']);
  });

  it('does nothing at the document’s edge, and leaves a text’s own range to ProseMirror', () => {
    const editor = mount([card('t1'), p('fim')]);
    selectBlock(editor, 't1');
    expect(press(editor, 'ArrowUp', { shift: true })).toBe(true);
    expect(where(editor)).toBe('node:t1');
    selectBlock(editor, 'fim', 'start');
    expect(press(editor, 'ArrowDown', { shift: true })).toBe(false);
  });
});

describe('⌘↓, ⌘↑, Ctrl+End, Ctrl+Home, Page Up and Page Down on a selected embed', () => {
  it('go to the document’s end and start from any card of a run', () => {
    const editor = mount([p('antes'), card('t1'), card('t2'), card('t3'), p('fim')]);
    for (const id of ['t1', 't2', 't3']) {
      selectBlock(editor, id);
      press(editor, 'ArrowDown', { meta: true });
      expect(where(editor)).toBe('caret:fim@end');
      selectBlock(editor, id);
      press(editor, 'ArrowUp', { meta: true });
      expect(where(editor)).toBe('caret:antes@start');
      selectBlock(editor, id);
      press(editor, 'End', { ctrl: true });
      expect(where(editor)).toBe('caret:fim@end');
      selectBlock(editor, id);
      press(editor, 'Home', { ctrl: true });
      expect(where(editor)).toBe('caret:antes@start');
    }
  });

  it('take Page Up and Page Down and stay, only on a selected embed', () => {
    const editor = mount([p('antes'), card('t1'), p('fim')]);
    selectBlock(editor, 't1');
    expect(press(editor, 'PageDown')).toBe(true);
    expect(press(editor, 'PageUp')).toBe(true);
    expect(where(editor)).toBe('node:t1');
    selectBlock(editor, 'antes', 'end');
    expect(press(editor, 'PageDown')).toBe(false);
    expect(press(editor, 'ArrowDown', { meta: true })).toBe(false);
  });
});

describe('⌫ and Delete next to an embed', () => {
  it('select the embed beside the caret first, then take it out with the document’s Remover', () => {
    const editor = mount([p('antes'), card('t1'), p('depois')]);
    selectBlock(editor, 'depois', 'start');
    expect(press(editor, 'Backspace')).toBe(true);
    expect(where(editor)).toBe('node:t1');
    expect(press(editor, 'Backspace')).toBe(true);
    expect(removed).toEqual(['t1']);
    selectBlock(editor, 'antes', 'end');
    expect(press(editor, 'Delete')).toBe(true);
    expect(where(editor)).toBe('node:t1');
    expect(press(editor, 'Delete')).toBe(true);
    expect(removed).toEqual(['t1', 't1']);
  });

  it('leave an empty line, a heading, a list item and a caret inside a text to BlockNote', () => {
    const editor = mount([
      p('antes'),
      card('t1'),
      p('vazio', ''),
      card('t2'),
      text('heading', 'titulo', 'título', { level: 2 }),
      card('t3'),
      text('bulletListItem', 'item'),
    ]);
    const shape = () => editor.document.map((block) => `${block.type}:${block.id}`).join(' ');
    selectBlock(editor, 'vazio', 'start');
    press(editor, 'Backspace');
    // BlockNote takes the empty line out and selects the embed above it.
    expect(shape()).toBe('paragraph:antes taskEmbed:t1 taskEmbed:t2 heading:titulo taskEmbed:t3 bulletListItem:item');
    expect(where(editor)).toBe('node:t1');
    // A heading and a list item first become a paragraph.
    selectBlock(editor, 'titulo', 'start');
    press(editor, 'Backspace');
    selectBlock(editor, 'item', 'start');
    press(editor, 'Backspace');
    expect(shape()).toBe('paragraph:antes taskEmbed:t1 taskEmbed:t2 paragraph:titulo taskEmbed:t3 paragraph:item');
    selectBlock(editor, 'antes', 'end');
    editor.prosemirrorView?.dispatch(
      editor.prosemirrorState.tr.setSelection(
        TextSelection.create(editor.prosemirrorState.doc, placeOf(editor, 'antes').from + 2),
      ),
    );
    expect(press(editor, 'Delete')).toBe(false);
    expect(removed).toEqual([]);
  });
});

describe('Tab, ⇧Tab and ↵', () => {
  it('never nest a block under an embed nor move an embed', () => {
    const editor = mount([p('antes'), card('t1'), p('depois')]);
    const before = JSON.stringify(editor.document);
    selectBlock(editor, 'depois', 'start');
    expect(press(editor, 'Tab')).toBe(true);
    selectBlock(editor, 't1');
    expect(press(editor, 'Tab')).toBe(true);
    expect(press(editor, 'Tab', { shift: true })).toBe(true);
    expect(JSON.stringify(editor.document)).toBe(before);
  });

  it('leave Tab elsewhere to BlockNote, which nests the block', () => {
    const editor = mount([p('um'), p('dois'), card('t1')]);
    selectBlock(editor, 'dois', 'start');
    press(editor, 'Tab');
    expect(editor.document[0]?.children.map((block) => block.id)).toEqual(['dois']);
  });

  it('↵ takes the key on a selected embed only', () => {
    const editor = mount([p('antes'), card('t1')]);
    selectBlock(editor, 't1');
    expect(press(editor, 'Enter')).toBe(true);
    expect(editor.document).toHaveLength(2);
    selectBlock(editor, 'antes', 'end');
    press(editor, 'Enter');
    expect(editor.document.map((block) => block.type)).toEqual(['paragraph', 'paragraph', 'taskEmbed']);
  });
});

describe('typing on a selected embed', () => {
  it('opens a paragraph after it for the letter, and keeps the embed', () => {
    const editor = mount([p('antes'), card('t1'), p('depois')]);
    selectBlock(editor, 't1');
    press(editor, 'x');
    expect(editor.document.map((block) => block.type)).toEqual(['paragraph', 'taskEmbed', 'paragraph', 'paragraph']);
    expect(where(editor)).toMatch(/^caret:/);
    expect(editor.getTextCursorPosition().block.id).toBe(editor.document[2]?.id);
  });
});
