import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { describe, expect, it } from 'vitest';
import { setupBlockNoteEditor } from '../testing/blocknote-editor';

// The DOM the view needs, as the editor tests have it.
setupBlockNoteEditor();

/**
 * The private parts of ProseMirror's view the editor relies on (review Sec R3), checked in the pinned version
 * as the single copy is (prosemirror-copy.test.ts): the embed keys take in the DOM's selection with
 * `domObserver.flush()` before ⌫ or Delete decides (syncSelectionFromDom, selection-drift.ts). A rename in an update fails here instead
 * of bringing the fast-key race back without a word.
 */
describe('ProseMirror’s view', () => {
  it('has domObserver.flush, which reads the DOM’s selection now', () => {
    const schema = new Schema({ nodes: { doc: { content: 'text*' }, text: {} } });
    const view = new EditorView(document.createElement('div'), { state: EditorState.create({ schema }) });
    const observer = (view as unknown as { domObserver?: { flush?: unknown } }).domObserver;
    expect(typeof observer?.flush).toBe('function');
    view.destroy();
  });
});
