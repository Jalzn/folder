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
 * The keys of an embed the arrows selected as a node (docs/etapas/11-documento-desenho.md, "Teclado e Esc"):
 * ↵ opens it as a click would, the card's task in the drawer and the figure's drawing, and does nothing on an
 * unavailable one; ⌫ and Delete remove the block. Never in a field, and the suggestion menus take ↵ first.
 * Tab and ⇧Tab keep blocks out of embeds (`nests`, `lifts`).
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
    Tab: nests,
    'Shift-Tab': lifts,
  },
});
