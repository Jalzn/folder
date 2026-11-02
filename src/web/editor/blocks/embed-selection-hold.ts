import { type EditorState, Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/** Whether the transaction's selection is the one the DOM has now, which ProseMirror read from it. */
function readFromDom(view: EditorView, tr: Transaction) {
  const dom = view.dom.ownerDocument.getSelection();
  if (!dom?.focusNode || !view.dom.contains(dom.focusNode)) return false;
  try {
    return view.posAtDOM(dom.focusNode, dom.focusOffset) === tr.selection.head;
  } catch {
    return false;
  }
}

/**
 * Keeps an embed selected where the editor put it (review A2). Chrome moves the DOM selection off an embed with
 * no text beside it, one in the middle of three or more in a row, to the start of the document's first line, as
 * a key goes up or as the focus comes back; ProseMirror follows the DOM, and the caret jumped to the top. From
 * the moment an embed is selected as a node until the pointer presses in the editor, a change of the selection
 * alone that ProseMirror read from the DOM is refused, and the editor's selection goes back to the DOM. A press
 * of the pointer, an edit or a selection set by the editor's API changes it as always; ProseMirror may mark a
 * read as the pointer's when a click came shortly before, so the hold watches the presses itself.
 */
export function embedSelectionHold(selected: (state: EditorState) => boolean) {
  let held = false;
  let view: EditorView | null = null;
  // Any press in the editor, a card's own button included, which ProseMirror's handlers never see.
  const press = () => {
    held = false;
  };
  return new Plugin({
    key: new PluginKey('embedSelectionHold'),
    filterTransaction(tr, state) {
      if (!held || !view || !selected(state) || tr.docChanged || !tr.selectionSet) return true;
      if (tr.selection.eq(state.selection) || !readFromDom(view, tr)) return true;
      // ProseMirror's focus() writes its selection back to the DOM.
      const current = view;
      queueMicrotask(() => {
        if (current.hasFocus()) current.focus();
      });
      return false;
    },
    view: (editorView) => {
      view = editorView;
      editorView.dom.addEventListener('pointerdown', press, true);
      return {
        // Each embed newly selected as a node holds, however it got there.
        update: (current, previous) => {
          if (selected(current.state) && !current.state.selection.eq(previous.selection)) held = true;
        },
        destroy: () => {
          editorView.dom.removeEventListener('pointerdown', press, true);
          view = null;
        },
      };
    },
  });
}
