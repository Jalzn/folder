import { type EditorState, Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/**
 * Whether the transaction's selection is the one the DOM has now, which ProseMirror read from it: its head is
 * where the DOM's focus is, read with either bias, as a point between elements reads either way.
 */
function readFromDom(view: EditorView, tr: Transaction) {
  const dom = view.dom.ownerDocument.getSelection();
  const node = dom?.focusNode;
  if (!dom || !node || !view.dom.contains(node)) return false;
  try {
    const head = tr.selection.head;
    return view.posAtDOM(node, dom.focusOffset, -1) === head || view.posAtDOM(node, dom.focusOffset, 1) === head;
  } catch {
    return false;
  }
}

/** The keys the embed keys act on: the plain arrows, ↵, ⌫ and Delete. */
const HANDLED = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Delete']);
/**
 * How long the hold outlasts the key: Chrome's selectionchange for the drift can come after the next frame,
 * so a frame alone let it through.
 */
const AFTER_KEYUP_MS = 80;

const handled = (event: KeyboardEvent) =>
  HANDLED.has(event.key) && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && !event.isComposing;

const holdKey = new PluginKey('embedSelectionHold');

/**
 * Marks a selection of an embed the editor's API makes outside a key, as Restaurar or an insertion does, so the
 * hold keeps it until the next key or press (see embedSelectionHold).
 */
export const holdSelectedEmbed = (tr: Transaction) => tr.setMeta(holdKey, true);

/**
 * Keeps an embed selected against Chrome's drift (review A2), and only against it (review R1). Chrome moves
 * the DOM selection off an embed with no text beside it, one in the middle of three or more in a row, to the
 * text above the run: as a key goes up, or on its own after the editor's API selected the embed, as Restaurar
 * does. ProseMirror follows the DOM, and the caret jumped up. With an embed selected as a node, a change of the
 * selection alone that ProseMirror read from the DOM is refused, and the editor's selection goes back to the
 * DOM, in two cases only:
 * - from the keydown of a plain arrow, ↵, ⌫ or Delete until a moment after its keyup (`held`);
 * - after a selection marked with holdSelectedEmbed, until the next key or press (`untouched`).
 * Any other key or a press of the pointer releases it, so ⌘↓, Shift+↓, Page Down, a screen reader or the
 * page's search move the selection from an embed the keys or the pointer selected, as always.
 */
export function embedSelectionHold(selected: (state: EditorState) => boolean) {
  let held = false;
  let untouched = false;
  let key = 0;
  let view: EditorView | null = null;
  const release = () => {
    held = false;
    untouched = false;
  };
  return new Plugin({
    key: holdKey,
    props: {
      handleDOMEvents: {
        // Before ProseMirror reads the DOM for this key, which takes in a drift that came before it.
        keydown: (current, event) => {
          key += 1;
          release();
          held = handled(event);
          // A drift Chrome made before this key, which ProseMirror has not read yet: the editor's selection goes
          // back to the DOM first. ProseMirror's focus() writes it there.
          if (held && selected(current.state) && current.hasFocus()) current.focus();
          return false;
        },
        keyup: () => {
          const up = key;
          if (held) setTimeout(() => up === key && release(), AFTER_KEYUP_MS);
          return false;
        },
      },
    },
    filterTransaction(tr, state) {
      if (tr.getMeta(holdKey)) untouched = true;
      if ((!held && !untouched) || !view || !selected(state) || tr.docChanged || !tr.selectionSet) return true;
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
      // Any press in the editor, a card's own button included, which ProseMirror's handlers never see.
      editorView.dom.addEventListener('pointerdown', release, true);
      return {
        destroy: () => {
          editorView.dom.removeEventListener('pointerdown', release, true);
          view = null;
        },
      };
    },
  });
}
