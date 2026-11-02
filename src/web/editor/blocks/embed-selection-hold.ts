import { type EditorState, Plugin, PluginKey, Selection, type Transaction } from '@tiptap/pm/state';
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

/** The keys the embed keys act on: the plain arrows, ↵, ⌫, Delete, Page Up and Page Down. */
const HANDLED = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Enter',
  'Backspace',
  'Delete',
  'PageUp',
  'PageDown',
]);
/** The keys the embed keys act on with ⇧: ⇧↑ and ⇧↓, which extend from the embed. */
const HANDLED_WITH_SHIFT = new Set(['ArrowUp', 'ArrowDown']);

/**
 * How long the hold outlasts the key: Chrome's selectionchange for the drift can come after the next frame,
 * so a frame alone let it through.
 */
const AFTER_KEYUP_MS = 80;

const handled = (event: KeyboardEvent) =>
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.isComposing &&
  (event.shiftKey ? HANDLED_WITH_SHIFT : HANDLED).has(event.key);

const holdKey = new PluginKey('embedSelectionHold');

/**
 * Marks a selection of an embed the editor's API makes outside a key, as Restaurar or an insertion does, so the
 * hold keeps it as it keeps one the arrows made (see embedSelectionHold).
 */
export const holdSelectedEmbed = (tr: Transaction) => tr.setMeta(holdKey, true);

/**
 * Whether the transaction's selection is where Chrome's drift puts it: a caret at the document's first place
 * for text, Chrome's fallback when the selection it holds has none.
 */
function driftsTo(tr: Transaction) {
  const first = Selection.findFrom(tr.doc.resolve(0), 1, true);
  return tr.selection.empty && first !== null && tr.selection.from === first.from;
}

/**
 * Keeps an embed selected against Chrome's drift (review A2), and only against it (review R1). Chrome cannot
 * keep a DOM selection on an embed with no text beside it, one in the middle of three or more in a row: as a
 * key goes up, and again as the next key goes down, it moves the DOM selection to the document's first text.
 * ProseMirror reads that, the second time before any plugin sees the key, and the caret jumped to the top. With
 * an embed selected as a node, a change of the selection alone that ProseMirror read from the DOM is refused,
 * and the editor's selection goes back to the DOM:
 * - any such change, from the keydown of a key the embed keys act on (a plain arrow, ↵, ⌫, Delete, Page Up
 *   or Down, ⇧↑ or ⇧↓) until a moment after its keyup (`inKey`);
 * - one to the document's first place for text, the drift's place, after such a key or after the embed
 *   actions selected the embed themselves (holdSelectedEmbed), until another key or a press of the pointer
 *   (`sticky`).
 * Any other change goes through: ⌘↓, Shift+↓, a screen reader or the page's search move the selection as
 * always. Native keys start from where Chrome keeps the DOM's selection, which for such an embed is the
 * document's first text.
 */
export function embedSelectionHold(selected: (state: EditorState) => boolean) {
  let inKey = false;
  let sticky = false;
  let key = 0;
  let view: EditorView | null = null;
  const release = () => {
    inKey = false;
    sticky = false;
  };
  /** Whether the hold refuses this change, which ProseMirror read from the DOM. */
  const refuses = (tr: Transaction) => inKey || (sticky && driftsTo(tr));
  return new Plugin({
    key: holdKey,
    props: {
      handleDOMEvents: {
        keydown: (current, event) => {
          // ⇧ going down before its key leaves the hold as it is: that key decides, as ⇧↓ is the embed keys'.
          // ⌘, Ctrl and ⌥ let go of it at once, before the native keys they make.
          if (event.key === 'Shift') return false;
          key += 1;
          inKey = handled(event);
          sticky = inKey;
          // A drift Chrome made as this key went down, which ProseMirror has not read yet: the editor's
          // selection goes back to the DOM first. ProseMirror's focus() writes it there.
          if (inKey && selected(current.state) && current.hasFocus()) current.focus();
          return false;
        },
        keyup: () => {
          const up = key;
          if (inKey)
            setTimeout(() => {
              if (up === key) inKey = false;
            }, AFTER_KEYUP_MS);
          return false;
        },
      },
    },
    filterTransaction(tr, state) {
      if (tr.getMeta(holdKey)) sticky = true;
      if ((!inKey && !sticky) || !view || !selected(state) || tr.docChanged || !tr.selectionSet) return true;
      if (tr.selection.eq(state.selection) || !readFromDom(view, tr) || !refuses(tr)) return true;
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
