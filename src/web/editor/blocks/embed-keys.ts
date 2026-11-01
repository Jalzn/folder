import { type BlockNoteEditor, createExtension } from '@blocknote/core';

const EMBED_TYPES = new Set(['taskEmbed', 'drawingEmbed']);

// biome-ignore lint/suspicious/noExplicitAny: the extension serves any schema that has the embeds.
type AnyEditor = BlockNoteEditor<any, any, any>;

/** Whether the arrows selected an embed as a node, the only time these keys are the embed's. */
export function selectedEmbed(editor: AnyEditor) {
  const selection = editor.prosemirrorState.selection;
  if (!('node' in selection)) return false;
  return EMBED_TYPES.has((selection.node as { type: { name: string } }).type.name);
}

/** ⌫ and Delete: the block leaves as an edit of the document, which the editor's ⌘Z brings back. */
function remove({ editor }: { editor: AnyEditor }) {
  if (!selectedEmbed(editor)) return false;
  const block = editor.getTextCursorPosition().block;
  const next = editor.getNextBlock(block) ?? editor.getPrevBlock(block);
  editor.removeBlocks([block]);
  if (next) editor.setTextCursorPosition(next, 'start');
  return true;
}

/**
 * The keys of an embed the arrows selected as a node (docs/etapas/11-documento-desenho.md, "Teclado e Esc"):
 * ↵ opens it as a click would, the card's task in the drawer and the figure's drawing, and does nothing on an
 * unavailable one; ⌫ and Delete remove the block. Never in a field, and the suggestion menus take ↵ first.
 */
export const EmbedKeysExtension = createExtension({
  key: 'embedKeys',
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      if (!selectedEmbed(editor)) return false;
      const selection = editor.prosemirrorState.selection;
      const dom = editor.prosemirrorView?.nodeDOM(selection.from);
      const target = dom instanceof HTMLElement ? dom.querySelector<HTMLElement>('.embed-card, .embed-figure') : null;
      target?.click();
      return true;
    },
    Backspace: remove,
    Delete: remove,
  },
});
