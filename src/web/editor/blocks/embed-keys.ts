import { type BlockNoteEditor, createExtension } from '@blocknote/core';
import type { EditorState } from '@tiptap/pm/state';
import { type EmbedClipboardActions, embedClipboard } from './embed-clipboard';
import { embedPaste } from './embed-paste';
import { type BlockPlace, blockAfter, blockBefore } from './embed-places';
import { embedSelectionHold } from './embed-selection-hold';
import { embedTyping } from './embed-typing';

const EMBED_TYPES = new Set(['taskEmbed', 'drawingEmbed']);

// biome-ignore lint/suspicious/noExplicitAny: the extension serves any schema that has the embeds.
type AnyEditor = BlockNoteEditor<any, any, any>;

/** Whether the state has an embed selected as a node. */
const embedSelectedIn = ({ selection }: EditorState) =>
  'node' in selection && EMBED_TYPES.has((selection.node as { type: { name: string } }).type.name);

/** Whether the arrows selected an embed as a node, the only time these keys are the embed's. */
export const selectedEmbed = (editor: AnyEditor) => embedSelectedIn(editor.prosemirrorState);

/** ↵: what a click on the embed does, the card's drawer or the figure's drawing. */
function open({ editor }: { editor: AnyEditor }) {
  if (!selectedEmbed(editor)) return false;
  const selection = editor.prosemirrorState.selection;
  const dom = editor.prosemirrorView?.nodeDOM(selection.from);
  const target = dom instanceof HTMLElement ? dom.querySelector<HTMLElement>('.embed-card, .embed-figure') : null;
  target?.click();
  return true;
}

/**
 * What the keys ask of the document: an embed's block out, as "Remover" takes it, with Desfazer, and the
 * words and link of a copied one (embed-clipboard.ts).
 */
export type EmbedKeyActions = EmbedClipboardActions;

/**
 * The embed next to a caret at the edge of a text: after its end (`forward`) or before its start, in reading
 * order; null when the caret is elsewhere or the block beside it is not an embed.
 */
function embedBeside({ selection, doc }: EditorState, forward: boolean) {
  const { $from } = selection;
  const edge = forward ? $from.parent.content.size : 0;
  if (!selection.empty || !$from.parent.isTextblock || $from.parentOffset !== edge) return null;
  const beside = forward ? blockAfter(doc, $from.after()) : blockBefore(doc, $from.before());
  return beside && EMBED_TYPES.has(beside.type) ? beside : null;
}

/**
 * Takes in the DOM's selection before a key decides on the caret: a ⌘← pressed right before ⌫ has moved it,
 * but ProseMirror reads it only at the selectionchange still to come, and the deletion that runs after this
 * key reads the DOM (review, fast-key race). ProseMirror's observer has no public way to do it.
 */
function readDomSelection(editor: AnyEditor) {
  (editor.prosemirrorView as unknown as { domObserver?: { flush(): void } } | undefined)?.domObserver?.flush();
}

/**
 * ⌫ and Delete (review M1): never an embed in one key. With the caret at the start of a text after an embed,
 * ⌫ selects the embed, and Delete does at the end of a text before one; a second ⌫ or Delete takes the
 * selected embed out with the document's "Remover", whose toast offers Desfazer. An empty line goes as
 * BlockNote takes it, selecting the embed above, and a heading or a list item first becomes a paragraph.
 */
function deletes(forward: boolean, actions: EmbedKeyActions) {
  return ({ editor }: { editor: AnyEditor }) => {
    readDomSelection(editor);
    if (selectedEmbed(editor)) {
      actions.remove(editor.getTextCursorPosition().block.id);
      return true;
    }
    const state = editor.prosemirrorState;
    const { parent } = state.selection.$from;
    if (!forward && (parent.type.name !== 'paragraph' || !parent.content.size)) return false;
    const beside = embedBeside(state, forward);
    if (!beside) return false;
    editor.setTextCursorPosition(beside.id);
    return true;
  };
}

/**
 * The arrows through embeds (review A2), a block at a time by the editor's API and never through ProseMirror's
 * gap cursor, whose invisible stops sent ↓ back to the top of the document and made ↑ skip embeds: from an embed
 * selected as a node, or a gap cursor, the next block in reading order (↓ →) or the one before (↑ ←), an embed
 * selected as a node and a text with the caret at its start or end. ← at the start of a text and → at its end
 * select the embed next to it. Up and down from a text stay ProseMirror's, which selects the embed next to it.
 * At the document's edge, nothing to go to, ProseMirror's own way stays: it makes room to write there.
 */
function arrow(forward: boolean, vertical: boolean) {
  return ({ editor, event }: { editor: AnyEditor; event: KeyboardEvent }) => {
    if (event.isComposing) return false;
    const { selection, doc } = editor.prosemirrorState;
    let target: BlockPlace | null;
    if (selectedEmbed(editor)) target = forward ? blockAfter(doc, selection.to) : blockBefore(doc, selection.from);
    else if (selection.toJSON().type === 'gapcursor')
      target = forward ? blockAfter(doc, selection.from) : blockBefore(doc, selection.from);
    else target = vertical ? null : embedBeside(editor.prosemirrorState, forward);
    if (!target) return false;
    const { id } = target;
    editor.transact((tr) => {
      editor.setTextCursorPosition(id, forward ? 'start' : 'end');
      tr.scrollIntoView();
    });
    return true;
  };
}

/**
 * Tab and ⇧Tab never put a block under an embed, nor take one out and hand it the blocks below as children:
 * the server refuses an embed with blocks inside. Tab does nothing when the block above the first one selected
 * is an embed, and neither key moves an embed; elsewhere they nest and lift as always.
 */
function nests({ editor }: { editor: AnyEditor }) {
  if (selectedEmbed(editor)) return true;
  const first = editor.getSelection()?.blocks[0] ?? editor.getTextCursorPosition().block;
  const above = editor.getPrevBlock(first);
  return Boolean(above && EMBED_TYPES.has(above.type));
}
function lifts({ editor }: { editor: AnyEditor }) {
  if (selectedEmbed(editor)) return true;
  return Boolean(editor.getSelection()?.blocks.some((block) => EMBED_TYPES.has(block.type)));
}

/**
 * The keys of a document's embeds (docs/etapas/11-documento-desenho.md, "Teclado e Esc"), one extension per
 * editor: ↵ on an embed selected as a node opens it as a click would, the card's task in the drawer and the
 * figure's drawing, and does nothing on an unavailable one; ⌫ and Delete select an embed beside the caret,
 * then take it out (`deletes`). Never in a field, and the suggestion menus take ↵ first. Tab and ⇧Tab keep
 * blocks out of embeds (`nests`, `lifts`), and the arrows go through them a block at a time (`arrow`). ⌘C
 * and ⌘X copy a selected embed as its block and as its link (embed-clipboard.ts), a paste never brings an
 * embed the server would refuse (embed-paste.ts), and typing on one writes in a new paragraph after it
 * (embed-typing.ts).
 */
export const createEmbedKeys = (actions: EmbedKeyActions) =>
  createExtension(({ editor }: { editor: AnyEditor }) => ({
    key: 'embedKeys',
    // Before BlockNote's keys of a selected node, which swallow a typed letter.
    runsBefore: ['nodeSelectionKeyboard'],
    prosemirrorPlugins: [
      embedSelectionHold(embedSelectedIn),
      embedClipboard(embedSelectedIn, actions),
      embedPaste(),
      embedTyping(editor, embedSelectedIn),
    ],
    keyboardShortcuts: {
      Enter: open,
      Backspace: deletes(false, actions),
      Delete: deletes(true, actions),
      Tab: nests,
      'Shift-Tab': lifts,
      ArrowDown: arrow(true, true),
      ArrowUp: arrow(false, true),
      ArrowRight: arrow(true, false),
      ArrowLeft: arrow(false, false),
    },
  }))();
