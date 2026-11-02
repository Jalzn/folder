import { type EditorState, Plugin, PluginKey, Selection, type Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { AnyBlockEditor } from '../types';

/**
 * Chrome's selection drift and ProseMirror's private DOM observer: the one module that knows of either
 * (docs/etapas/11-documento-desenho.md, reviews A2, R1, B-f, fast keys).
 *
 * Chrome cannot keep a DOM selection on an embed with no text beside it, one in the middle of three or more in
 * a row: as a key goes up, and again as the next key goes down, it moves the DOM selection to the document's
 * first text. ProseMirror reads that, the second time before any plugin sees the key, and the caret jumped to
 * the top. The guard refuses such a change while an embed is selected as a node, and the editor's selection
 * goes back to the DOM.
 */

/**
 * What the guard knows when a transaction comes: its own memory (`inKey`, `sticky`) and the transaction's facts.
 * - `inKey`: from the keydown of a key the embed keys act on until a moment after its keyup;
 * - `sticky`: after such a key, or after the embed actions selected the embed themselves, until another key
 *   or a press of the pointer;
 * - `readFromDom`: the transaction's selection is the one the DOM has now, as ProseMirror read it;
 * - `atFirstText`: it is a caret at the document's first place for text, where the drift puts it.
 */
export interface DriftFacts {
  inKey: boolean;
  sticky: boolean;
  embedSelected: boolean;
  docChanged: boolean;
  selectionSet: boolean;
  sameSelection: boolean;
  readFromDom: boolean;
  atFirstText: boolean;
}

/**
 * The guard's policy (review R1: only against the drift). With an embed selected as a node, a change of the
 * selection alone that ProseMirror read from the DOM is refused:
 * - any such change while `inKey`;
 * - one to the document's first place for text while `sticky`.
 * Any other change goes through: a screen reader or the page's search move the selection as always.
 */
export function driftDecision(facts: DriftFacts): 'refuse' | 'pass' {
  if (!facts.inKey && !facts.sticky) return 'pass';
  if (!facts.embedSelected || facts.docChanged || !facts.selectionSet || facts.sameSelection) return 'pass';
  if (!facts.readFromDom) return 'pass';
  return facts.inKey || facts.atFirstText ? 'refuse' : 'pass';
}

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

/** Whether the transaction's selection is a caret at the document's first place for text, the drift's place. */
function atFirstText(tr: Transaction) {
  const first = Selection.findFrom(tr.doc.resolve(0), 1, true);
  return tr.selection.empty && first !== null && tr.selection.from === first.from;
}

/**
 * How long the hold outlasts the key: Chrome's selectionchange for the drift can come after the next frame,
 * so a frame alone let it through.
 */
const AFTER_KEYUP_MS = 80;

const guardKey = new PluginKey('embedSelectionHold');

/**
 * The guard against the drift, for the document's editor. `holdsKey` names the keys the embed keys act on
 * (embed-keymap.ts). Native keys, as Home or ⌥↓, start from where Chrome keeps the DOM's selection, which for
 * such an embed is the document's first text.
 */
export function selectionDriftGuard({
  isEmbedSelected,
  holdsKey,
}: {
  isEmbedSelected: (state: EditorState) => boolean;
  holdsKey: (event: KeyboardEvent) => boolean;
}) {
  let inKey = false;
  let sticky = false;
  let key = 0;
  let view: EditorView | null = null;
  const release = () => {
    inKey = false;
    sticky = false;
  };
  return new Plugin({
    key: guardKey,
    props: {
      handleDOMEvents: {
        keydown: (current, event) => {
          // ⇧ going down before its key leaves the hold as it is: that key decides, as ⇧↓ is the embed keys'.
          // ⌘, Ctrl and ⌥ let go of it at once, before the native keys they make.
          if (event.key === 'Shift') return false;
          key += 1;
          inKey = holdsKey(event);
          sticky = inKey;
          // A drift Chrome made as this key went down, which ProseMirror has not read yet: the editor's
          // selection goes back to the DOM first. ProseMirror's focus() writes it there.
          if (inKey && isEmbedSelected(current.state) && current.hasFocus()) current.focus();
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
      if (tr.getMeta(guardKey)) sticky = true;
      if (!view) return true;
      const facts = {
        inKey,
        sticky,
        embedSelected: (inKey || sticky) && isEmbedSelected(state),
        docChanged: tr.docChanged,
        selectionSet: tr.selectionSet,
        sameSelection: tr.selection.eq(state.selection),
      };
      // The DOM is read only when the transaction could be the drift.
      if (driftDecision({ ...facts, readFromDom: true, atFirstText: true }) === 'pass') return true;
      const current = view;
      if (driftDecision({ ...facts, readFromDom: readFromDom(current, tr), atFirstText: atFirstText(tr) }) === 'pass')
        return true;
      // ProseMirror's focus() writes its selection back to the DOM.
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

/**
 * Selects a block by the editor's API outside a key, as Restaurar or an insertion does, and marks it for the
 * guard, which keeps the embed as it keeps one the arrows selected (`sticky`).
 */
export function selectEmbedBlock(editor: AnyBlockEditor, blockId: string) {
  editor.transact((tr) => {
    editor.setTextCursorPosition(blockId);
    tr.setMeta(guardKey, true);
  });
}

/**
 * Takes in the DOM's selection before a key decides on the caret: a ⌘← pressed right before ⌫ has moved it,
 * but ProseMirror reads it only at the selectionchange still to come, and the deletion that runs after this
 * key reads the DOM (review, fast-key race). ProseMirror's observer has no public way to do it
 * (prosemirror-internals.test.ts guards the private one).
 *
 * Only for a key the person pressed. After the browser deleted a character itself, ProseMirror offers the
 * handlers a ⌫ it makes up (`isTrusted` false) while the editor still holds the text before the deletion; the
 * DOM's caret has already moved back, so reading it then put a caret at offset 1 at the start, and ⌫ selected
 * the embed above instead of deleting the first letter (validation of stage 11).
 */
export function syncSelectionFromDom(view: EditorView | undefined, event: Event) {
  if (!event.isTrusted) return;
  (view as unknown as { domObserver?: { flush(): void } } | undefined)?.domObserver?.flush();
}
